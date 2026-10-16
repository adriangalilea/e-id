import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { links } from "@/db/schema"
import {
  type CardErrors,
  errorsOf,
  type KeptShortLink,
  MOST_ON_CARD,
  shortLinkSchema,
} from "@/lib/card-edit"
import { refusedDestination } from "@/lib/link-safety"
import { profileTag } from "@/lib/tags"
import { type Allowance, allowanceOf, reached } from "@/lib/trust"

// A PERSON'S SHORT LINKS, read and written for a user, never a session: the
// site's actions (db/actions) pass the signed-in user, the API (app/api/v1) the
// key's, so both are one path with every limit in it. `expire` is how the caller
// drops a cached page (a server action's `updateTag`, a route's `revalidateTag`):
// the one thing the two cannot share.

export type Expire = (tag: string) => void

const dayOf = (at: Date | null) => (at ? at.toISOString().slice(0, 10) : "")

/** `userId`'s short links, every link of their own, on the card or not, newest
 *  first, and how many they may keep (lib/trust). */
export async function shortLinksOf(userId: string): Promise<{
  links: KeptShortLink[]
  allowance: Allowance
}> {
  const [rows, allowance] = await Promise.all([
    db
      .select()
      .from(links)
      .where(and(eq(links.user_id, userId), eq(links.platform, "link")))
      .orderBy(desc(links.order)),
    allowanceOf(userId),
  ])
  return {
    links: rows.map((l) => ({
      id: l.id,
      value: l.value ?? "",
      slug: l.slug ?? "",
      label: l.label ?? "",
      expires: dayOf(l.expires_at),
      maxVisits: l.max_visits,
      public: l.public,
      visits: l.visits,
      stopped: l.stopped_why,
      kind: l.kind,
      file: l.custom_data?.file ?? null,
    })),
    allowance,
  }
}

export type ShortLinkResult =
  | { ok: true; link: KeptShortLink }
  | { ok: false; errors: CardErrors }

/** Writes one of `userId`'s short links, a new one (`id` null) or theirs:
 *  checked with the schema the list writes it with (lib/card-edit). A new one
 *  goes last on the card when it is on it. Refused past what they may keep
 *  (lib/trust), past MOST_ON_CARD links on the card, at a name they already use,
 *  or where Safe Browsing lists where it goes (lib/link-safety). One taken down
 *  stays down: it can be deleted, not changed. */
export async function writeShortLink(
  userId: string,
  input: unknown,
  expire: Expire,
): Promise<ShortLinkResult> {
  const parsed = shortLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: errorsOf(parsed.error) }
  const a = parsed.data
  const owned = await db
    .select({
      id: links.id,
      platform: links.platform,
      value: links.value,
      public: links.public,
      order: links.order,
      stopped: links.stopped_why,
      kind: links.kind,
    })
    .from(links)
    .where(eq(links.user_id, userId))
  const was = a.id ? owned.find((l) => l.id === a.id) : undefined
  if (a.id && (was?.platform !== "link" || was.kind !== "url"))
    throw new Error(
      `writeShortLink: ${a.id} is not a short link of ${userId}'s`,
    )
  if (was?.stopped)
    return {
      ok: false,
      errors: { value: "This link was taken down: it can only be deleted." },
    }
  if (!a.id) {
    const allowance = await allowanceOf(userId)
    if (owned.filter((l) => l.platform === "link").length >= allowance.most)
      return { ok: false, errors: { slug: reached(allowance) } }
  }
  const checked = a.value !== was?.value
  if (checked) {
    const refused = await refusedDestination([
      { platform: "link", value: a.value },
    ])
    if (refused) return { ok: false, errors: { value: refused } }
  }
  const onCardNow = owned.filter((l) => l.public && l.id !== a.id).length
  if (a.public && onCardNow >= MOST_ON_CARD)
    return {
      ok: false,
      errors: {
        public: `A card shows at most ${MOST_ON_CARD} links: hide one first.`,
      },
    }
  const fields = {
    value: a.value,
    slug: a.slug.toLowerCase(),
    label: a.label || null,
    // Through the day it names, in UTC.
    expires_at: a.expires ? new Date(`${a.expires}T23:59:59.999Z`) : null,
    max_visits: a.maxVisits,
    public: a.public,
    ...(checked && { checked_at: new Date() }),
  }
  let id = a.id
  try {
    if (id) await db.update(links).set(fields).where(eq(links.id, id))
    else {
      id = crypto.randomUUID()
      await db.insert(links).values({
        id,
        user_id: userId,
        platform: "link",
        order: Math.max(-1, ...owned.map((l) => l.order ?? -1)) + 1,
        ...fields,
      })
    }
  } catch (error) {
    const said = String((error as { cause?: unknown }).cause ?? error)
    if (/UNIQUE constraint failed: link\.user_id, link\.slug/.test(said))
      return {
        ok: false,
        errors: { slug: `You already have a short link at /${fields.slug}.` },
      }
    throw error
  }
  // The card changes only where the short link is on it, or was.
  if (a.public || was?.public) expire(profileTag(userId))
  const [row] = await db
    .select({ visits: links.visits })
    .from(links)
    .where(eq(links.id, id))
  return {
    ok: true,
    link: {
      ...a,
      id,
      slug: fields.slug,
      visits: row?.visits ?? 0,
      stopped: null,
      kind: "url",
      file: null,
    },
  }
}

/** Deletes one of `userId`'s short links: it opens nothing from now on, its
 *  name free for another of theirs. False where they have no such link. */
export async function removeShortLink(
  userId: string,
  id: string,
  expire: Expire,
): Promise<boolean> {
  const [gone] = await db
    .delete(links)
    .where(
      and(
        eq(links.id, id),
        eq(links.user_id, userId),
        eq(links.platform, "link"),
      ),
    )
    .returning({ public: links.public })
  if (!gone) return false
  if (gone.public) expire(profileTag(userId))
  return true
}
