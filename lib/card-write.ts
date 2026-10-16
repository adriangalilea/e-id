import "server-only"

import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { links, users } from "@/db/schema"
import {
  type CardEdit,
  cardEditSchema,
  errorsOf,
  type SaveResult,
} from "@/lib/card-edit"
import { ANYWHERE, refusedDestination } from "@/lib/link-safety"
import type { Expire } from "@/lib/short-links"
import { profileTag, USERS_TAG, usernameTag } from "@/lib/tags"
import { allowanceOf, reached } from "@/lib/trust"
import { claimUsername } from "@/lib/username"

// A PERSON'S CARD, read whole for editing and written whole, for a user, never a
// session: the site's editor (db/actions) passes the signed-in user, the API
// (app/api/v1/card) the key's, which changes one thing on the card it read and
// writes it back through here, so both are one path with every check in it (the
// schema, Safe Browsing, what the account may keep, the handle). `expire` drops
// the cached pages, as in lib/short-links.

/** Whether a link is the card's (edited on it): a platform's, or one of your
 *  own shown on it. One of your own off the card is a short link only, kept in
 *  its own list (lib/card-edit), and a send is never on it. */
export function onCard(link: { platform: string; public: boolean }) {
  return link.platform !== "link" || link.public
}

/** `userId`'s card as they edit it in place (lib/card-edit): every link on it,
 *  the hidden ones too, which the public page never carries. */
export async function editableCard(userId: string): Promise<CardEdit> {
  const [row] = await db
    .select({
      name: users.name,
      username: users.username,
      country: users.country_code,
      bio: users.bio,
      vouches: users.allow_comments,
    })
    .from(users)
    .where(eq(users.id, userId))
  if (!row?.username) throw new Error(`editableCard: no user ${userId}`)
  const owned = await db
    .select()
    .from(links)
    .where(eq(links.user_id, userId))
    .orderBy(links.order)
  return {
    name: row.name ?? "",
    handle: row.username,
    country: row.country ?? "XX",
    bio: row.bio ?? "",
    vouches: row.vouches,
    links: owned.filter(onCard).map((link) => ({
      id: link.id,
      platform: link.platform,
      value: link.value ?? "",
      label: link.label ?? "",
      note: link.note ?? "",
      highlight: link.custom_data?.highlight ?? "",
      public: link.public,
      slug: link.slug ?? "",
      visits: link.visits,
    })),
  }
}

/** Writes `userId`'s card whole, or nothing: the card parsed with the schema
 *  both sides share (lib/card-edit), every link it names checked as theirs,
 *  what goes somewhere new asked of Safe Browsing, what it adds held to what
 *  they may keep, then one transaction (name, country, bio; links in the card's
 *  order, one gone from it deleted, a new one made; the handle). A taken handle
 *  undoes the lot and comes back as the handle's error. `renamed`: the new
 *  handle, for the caller that keeps a display cookie of it. */
export async function writeCard(
  userId: string,
  input: unknown,
  expire: Expire,
): Promise<SaveResult & { renamed?: string }> {
  const parsed = cardEditSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) }
  const card = parsed.data

  const [row] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
  if (!row?.username) throw new Error(`writeCard: no user ${userId}`)
  const all = await db
    .select({
      id: links.id,
      platform: links.platform,
      value: links.value,
      public: links.public,
      custom_data: links.custom_data,
    })
    .from(links)
    .where(eq(links.user_id, userId))
  // The card's links only: a short link off the card is its list's, never
  // touched here.
  const owned = all.filter(onCard)
  const named = new Set(card.links.flatMap((l) => (l.id ? [l.id] : [])))
  for (const id of named)
    if (!owned.some((l) => l.id === id))
      throw new Error(`writeCard: link ${id} is not on ${userId}'s card`)
  const renamed = card.handle !== row.username

  // What goes somewhere new is asked of Safe Browsing (lib/link-safety).
  const fresh = card.links.filter(
    (l) => l.value !== owned.find((o) => o.id === l.id)?.value,
  )
  const refused = await refusedDestination(fresh)
  if (refused) return { ok: false, errors: { links: refused } }
  // A link of their own the card adds counts towards what they may keep
  // (lib/trust), its short links with it.
  const added = card.links.filter((l) => l.platform === "link" && !l.id).length
  if (added > 0) {
    const allowance = await allowanceOf(userId)
    const gone = owned.filter(
      (o) => o.platform === "link" && !named.has(o.id),
    ).length
    const kept = all.filter((l) => l.platform === "link").length - gone
    if (kept + added > allowance.most)
      return { ok: false, errors: { links: reached(allowance) } }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: card.name || null,
          bio: card.bio || null,
          country_code: card.country.toUpperCase(),
          allow_comments: card.vouches,
        })
        .where(eq(users.id, userId))
      const gone = owned.filter((l) => !named.has(l.id)).map((l) => l.id)
      if (gone.length > 0) await tx.delete(links).where(inArray(links.id, gone))
      // The card's address names cleared first: two links trading names (/cv
      // and /talk) would otherwise collide with each other half way.
      const kept = owned.filter((l) => named.has(l.id)).map((l) => l.id)
      if (kept.length > 0)
        await tx
          .update(links)
          .set({ slug: null })
          .where(inArray(links.id, kept))
      for (const [order, link] of card.links.entries()) {
        // What was read from the platform stays; the highlight is the owner's
        // (none is left out of the stored JSON).
        const read = owned.find((l) => l.id === link.id)?.custom_data ?? {}
        const own = link.platform === "link"
        const fields = {
          value: link.value,
          label: link.label || null,
          public: link.public,
          order,
          note: link.note || null,
          custom_data: { ...read, highlight: link.highlight || undefined },
          slug: own ? link.slug.toLowerCase() : null,
          ...(ANYWHERE.includes(link.platform) &&
            fresh.includes(link) && { checked_at: new Date() }),
        }
        if (link.id)
          await tx.update(links).set(fields).where(eq(links.id, link.id))
        else
          await tx.insert(links).values({
            id: crypto.randomUUID(),
            user_id: userId,
            platform: link.platform,
            ...fields,
          })
      }
      if (renamed) await claimUsername(userId, card.handle, tx)
    })
  } catch (error) {
    // What the database said: drizzle wraps it ("Failed query: …") and keeps it
    // as the cause.
    const said = String((error as { cause?: unknown }).cause ?? error)
    // The card's own check refuses two links at one name, so the database
    // refusing one is a race between two saves: said, not thrown.
    if (/UNIQUE constraint failed: link\.user_id, link\.slug/.test(said))
      return {
        ok: false,
        errors: { links: "One of your short links already has that name." },
      }
    if (renamed && /UNIQUE constraint failed: user\.username/.test(said))
      return { ok: false, errors: { handle: "That username is taken." } }
    throw error
  }

  expire(USERS_TAG)
  expire(profileTag(userId))
  if (renamed) expire(usernameTag(card.handle))
  return {
    ok: true,
    username: card.handle,
    ...(renamed && { renamed: card.handle }),
  }
}
