"use server"

import { and, desc, eq, not } from "drizzle-orm"
import { updateTag } from "next/cache"
import { headers } from "next/headers"
import { hasFlag } from "@/components/ui/flag"
import { db } from "@/db"
import {
  comments,
  links,
  proInterest,
  type SelectComment,
  users,
} from "@/db/schema"
import { answerLogin, keysOf, revokeKey } from "@/lib/api-keys"
import { asLinks, type Written } from "@/lib/card-draft"
import type { CardEdit, SaveResult } from "@/lib/card-edit"
import { editableCard, writeCard } from "@/lib/card-write"
import { type Chip, chipOf } from "@/lib/chip"
import { writeChip } from "@/lib/chip-server"
import { countryOf } from "@/lib/country-of"
import {
  cardLinkOf,
  getProfile,
  getPublicLinks,
  type Writer,
  writerOf,
} from "@/lib/data"
import { isAdmin } from "@/lib/env"
import { getGithubProfile } from "@/lib/github"
import { ANYWHERE, refusedDestination } from "@/lib/link-safety"
import { DRAFTED } from "@/lib/platforms"
import { getPresence, getWebsite, type Presence } from "@/lib/presence"
import { allowed, callerOf } from "@/lib/rate-limit"
import { getSession } from "@/lib/session"
import {
  removeShortLink,
  type ShortLinkResult,
  shortLinksOf,
  writeShortLink,
} from "@/lib/short-links"
import { profileTag, USERS_TAG, usernameTag } from "@/lib/tags"
import { claimUsername, holderOf } from "@/lib/username"
import { usernameProblem } from "@/lib/username-rules"
import { SITE, visitDriver, visitsEnabled } from "@/lib/visit-store"
import { type OwnerReport, readOwner } from "@/lib/visits"
import type { Unfurl } from "@/lib/web-preview-facts"

// Every export here is an endpoint anyone can call with any arguments: each one
// reads the session itself and acts only on what that user owns. A profile's
// public page is prerendered, so a write that changes it expires its tag
// (lib/tags) with updateTag.

const SIGNED_OUT = "You are not signed in."

async function requireUser() {
  const session = await getSession()
  if (!session) throw new Error(SIGNED_OUT)
  return session.user
}

// ── comments ────────────────────────────────────────────────────────────────

export type ThreadComment = {
  commentId: string
  body: string
  createdAt: Date
  pinned: boolean
  user: Writer
}

export type CommentThread = {
  viewer: Chip
  isOwner: boolean
  /** Whether the profile takes new vouches (its owner's choice). */
  open: boolean
  comments: ThreadComment[]
}

/** The signed-in side of a profile's comments: every comment on it for its
 *  owner, the viewer's own for anyone else, so the viewer may remove each one.
 *  Null when signed out. */
export async function loadComments(
  profileUserId: string,
): Promise<CommentThread | null> {
  const session = await getSession()
  if (!session) return null
  const viewer = session.user
  const isOwner = viewer.id === profileUserId

  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.created_at,
      pinned: comments.pinned,
      commentatorId: comments.commentator_id,
      name: users.name,
      image: users.image,
      username: users.username,
    })
    .from(comments)
    .leftJoin(users, eq(comments.commentator_id, users.id))
    .where(
      isOwner
        ? eq(comments.profile_user_id, profileUserId)
        : and(
            eq(comments.profile_user_id, profileUserId),
            eq(comments.commentator_id, viewer.id),
          ),
    )
    .orderBy(desc(comments.created_at))
  const [profile] = await db
    .select({ open: users.allow_comments })
    .from(users)
    .where(eq(users.id, profileUserId))
  if (!profile) throw new Error(`loadComments: no user ${profileUserId}`)

  return {
    viewer: chipOf(viewer),
    isOwner,
    open: profile.open,
    comments: rows.map((row) => ({
      commentId: row.commentId,
      body: row.body,
      createdAt: row.createdAt,
      pinned: row.pinned,
      user: writerOf(row),
    })),
  }
}

export type CommentFormState = { resetKey: string; error: string | null }

export async function createComment(
  profileUserId: string,
  prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const session = await getSession()
  if (!session) return { ...prevState, error: SIGNED_OUT }
  const body = String(formData.get("body") ?? "").trim()
  if (!body) return { ...prevState, error: "Comment can't be empty" }

  const [profile] = await db
    .select({ id: users.id, allowComments: users.allow_comments })
    .from(users)
    .where(eq(users.id, profileUserId))
  if (!profile) return { ...prevState, error: "That profile does not exist." }
  // The form is only drawn where comments are open, but an action is an
  // endpoint anyone can call: the profile's own choice is checked here.
  if (!profile.allowComments)
    return { ...prevState, error: "This profile does not take comments." }

  await db.insert(comments).values({
    id: crypto.randomUUID(),
    profile_user_id: profileUserId,
    commentator_id: session.user.id,
    body,
  })
  return { resetKey: crypto.randomUUID(), error: null }
}

async function commentOf(id: SelectComment["id"]) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, id))
  if (!comment) throw new Error(`no comment ${id}`)
  return comment
}

export async function deleteComment(id: SelectComment["id"]) {
  const user = await requireUser()
  const comment = await commentOf(id)
  if (comment.commentator_id !== user.id && comment.profile_user_id !== user.id)
    throw new Error(
      "Only its author or the profile's owner can remove a comment.",
    )

  await db.delete(comments).where(eq(comments.id, id))
  if (comment.pinned) updateTag(profileTag(comment.profile_user_id))
}

export async function pinCommentToggle(id: SelectComment["id"]) {
  const user = await requireUser()
  const comment = await commentOf(id)
  if (comment.profile_user_id !== user.id)
    throw new Error("Only the profile's owner can pin a comment.")

  await db
    .update(comments)
    .set({ pinned: not(comments.pinned) })
    .where(eq(comments.id, id))
  updateTag(profileTag(user.id))
}

// ── profile ─────────────────────────────────────────────────────────────────

/** Claims a username for the signed-in user and points every cache and the
 *  display cookie at it. */
async function renameTo(
  user: { id: string; image?: string | null },
  username: string,
): Promise<string> {
  const valid = await claimUsername(user.id, username)
  updateTag(USERS_TAG)
  updateTag(profileTag(user.id))
  updateTag(usernameTag(valid))
  await writeChip(chipOf({ username: valid, image: user.image }))
  return valid
}

/** Why a rename failed, said to the person: taken, or the rule it breaks. */
function renameError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return /unique/i.test(message) ? "The username is taken" : message
}

/** The signed-in user's card as they edit it in place (lib/card-write). */
export async function cardToEdit(): Promise<CardEdit> {
  return editableCard((await requireUser()).id)
}

/** Writes the signed-in user's card whole, as edited in place (lib/card-write).
 *  The page re-renders with the write in the same response (`updateTag`); a
 *  rename moves the display cookie with it. */
export async function saveCard(input: unknown): Promise<SaveResult> {
  const user = await requireUser()
  const { renamed, ...saved } = await writeCard(user.id, input, updateTag)
  if (renamed) await writeChip(chipOf({ username: renamed, image: user.image }))
  return saved
}

// ── short links ─────────────────────────────────────────────────────────────

/** The signed-in user's short links and what they may keep (lib/short-links). */
export async function myShortLinks() {
  return shortLinksOf((await requireUser()).id)
}

/** Writes one of the signed-in user's short links (lib/short-links). */
export async function saveShortLink(input: unknown): Promise<ShortLinkResult> {
  return writeShortLink((await requireUser()).id, input, updateTag)
}

/** Deletes one of the signed-in user's short links (lib/short-links). */
export async function deleteShortLink(id: string): Promise<void> {
  const user = await requireUser()
  if (!(await removeShortLink(user.id, id, updateTag)))
    throw new Error(
      `deleteShortLink: ${id} is not a short link of ${user.id}'s`,
    )
}

export type HandleState = "free" | "taken" | "invalid"

/** Whether a handle can be someone's new address, as the home's card asks while
 *  it is typed: free, taken, or not a username at all (`invalid`, with why).
 *  Public: whether an address is taken is what its page already says. */
export async function handleState(
  handle: string,
): Promise<{ state: HandleState; why: string | null }> {
  const username = handle.trim()
  const why = usernameProblem(username)
  if (why) return { state: "invalid", why }
  return {
    state: (await holderOf(username)) ? "taken" : "free",
    why: null,
  }
}

/** A GitHub login as GitHub allows one: letters, digits and single hyphens, at
 *  most 39. */
const GITHUB_LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** What GitHub says publicly of a login, as the home's card fills itself with it
 *  when the visitor gives their GitHub: the photo, the name, the country its
 *  location names, its website. Null when GitHub has no such person (or only an
 *  organization). */
export async function githubCard(login: string): Promise<{
  login: string
  name: string | null
  /** large enough for the card's photo at 2x */
  image: string
  country: string | null
  website: string | null
} | null> {
  const typed = login.trim()
  if (!GITHUB_LOGIN.test(typed)) return null
  const profile = await getGithubProfile(typed)
  if (!profile || profile.user.org) return null
  return {
    login: profile.user.login,
    name: profile.name ?? null,
    image: profile.user.avatar.replace(/([?&])s=\d+/, "$1s=480"),
    country: profile.location ? countryOf(profile.location) : null,
    website: profile.website ?? null,
  }
}

/** A person's website as its preview shows it (@ag/web-preview), for the hover on
 *  their card's website mark wherever the card is (the home's pile, a profile):
 *  their own first public website, read and cached as their profile reads it
 *  (lib/presence, `getWebsite`). Asked by their username, never by an address: the
 *  server fetches only what a person stored, never a URL the browser names. Null
 *  where they have none or it would not answer. */
export async function websiteOf(username: string): Promise<Unfurl | null> {
  const profile = await getProfile(username)
  if (!profile) return null
  const site = (await getPublicLinks(profile.id)).find(
    (l) => l.platform === "website" && l.value,
  )
  return site ? getWebsite(cardLinkOf(site).url) : null
}

/** What the profile would show behind each link on the home's card, before
 *  there is an account: the same reads a profile makes (lib/presence), from the
 *  card's links instead of stored ones. Public reads of public pages, cached as
 *  a profile's are. Open to anyone, and each new website typed is a fetch e-ID
 *  makes, so one visitor gets PREVIEWS calls a window (lib/rate-limit); past it
 *  the card still works and its preview waits, empty. */
export async function previewPresence(
  drafted: Written["links"],
): Promise<Presence> {
  if (!allowed(callerOf(await headers()), PREVIEWS.most, PREVIEWS.windowMs))
    return NO_PRESENCE
  return getPresence(asLinks(drafted))
}

/** How many previews one visitor gets, and in what window: a card is filled in a
 *  handful, one a change to its links. */
const PREVIEWS = { most: 20, windowMs: 10 * 60 * 1000 }

/** A preview with nothing read. */
const NO_PRESENCE: Presence = {
  github: null,
  website: null,
  youtube: null,
  tweet: null,
  profiles: [],
}

/** How new an account must be to take a card filled on the home: the sign-in
 *  that made it has just come back. Older, it is someone signing in again with a
 *  card left in their browser, and their profile is not written over. */
const FRESH_MS = 10 * 60 * 1000

export type Claimed = {
  /** Theirs now: the drafted handle, or the one they had; null while they have
   *  none (their provider's was taken and the drafted one was refused). */
  username: string | null
  /** The account was not new and had an address, so nothing was written. */
  stale: boolean
  /** Why the drafted handle could not be the username (taken, too short). */
  refused: string | null
}

/** The drafted handle as the user's username, or why it cannot be. */
async function takeHandle(
  user: { id: string; image?: string | null; username?: string | null },
  handle: string,
): Promise<Claimed> {
  if (!handle || handle === user.username)
    return { username: user.username ?? null, stale: false, refused: null }
  try {
    return {
      username: await renameTo(user, handle),
      stale: false,
      refused: null,
    }
  } catch (error) {
    return {
      username: user.username ?? null,
      stale: false,
      refused: renameError(error),
    }
  }
}

/** The card a visitor filled on the home (lib/draft), written onto the account
 *  they just signed up with: the name, the country, its links (public, as they
 *  were on the card) and the handle as the username. An older account with no
 *  address yet takes the handle alone; one with an address is left as it is. */
export async function claimDraft(draft: Written): Promise<Claimed> {
  const user = await requireUser()
  const [row] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, user.id))
  if (!row) throw new Error(`claimDraft: no user ${user.id}`)
  if (Date.now() - row.createdAt.getTime() > FRESH_MS)
    return user.username
      ? { username: user.username, stale: true, refused: null }
      : takeHandle(user, draft.handle)

  const name = draft.name.trim()
  // Any country the picker offers (@ag/country-picker draws the flag set's); "XX"
  // for none, which has no flag.
  const country = hasFlag(draft.country) ? draft.country.toUpperCase() : "XX"
  await db
    .update(users)
    .set({ ...(name && { name }), country_code: country })
    .where(eq(users.id, user.id))

  // Sign-up already made a link for the provider (github, email): one the card
  // has too is made public, as it was on the card; the rest are made as written.
  const owned = await db
    .select({ id: links.id, platform: links.platform })
    .from(links)
    .where(eq(links.user_id, user.id))
  const drafted = draft.links.filter(
    (l) => DRAFTED.includes(l.platform) && l.value.trim() !== "",
  )
  for (const link of drafted) {
    const had = owned.find((o) => o.platform === link.platform)
    if (had)
      await db.update(links).set({ public: true }).where(eq(links.id, had.id))
  }
  // One Safe Browsing lists is left off the card, not the sign-up refused with it
  // (lib/link-safety): the person finishes signing up and adds what they can.
  const added = (
    await Promise.all(
      drafted
        .filter((l) => !owned.some((o) => o.platform === l.platform))
        .map(async (l) =>
          (await refusedDestination([{ ...l, value: l.value.trim() }]))
            ? []
            : [l],
        ),
    )
  ).flat()
  if (added.length > 0)
    await db.insert(links).values(
      added.map((link, i) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        platform: link.platform,
        value: link.value.trim(),
        public: true,
        order: owned.length + i,
        ...(ANYWHERE.includes(link.platform) && { checked_at: new Date() }),
      })),
    )
  updateTag(USERS_TAG)
  updateTag(profileTag(user.id))
  return takeHandle(user, draft.handle)
}

/** A person's own numbers, for their profile: every visit to their pages and every
 *  link their addresses opened, all time; the last 30 days in full (per day, what
 *  each name opened, referrers, countries) for an admin only, until Premium says
 *  whose they are (README). Null signed out, or while visits are off. */
export type OwnStats = {
  views: number
  hits: number
  detail: OwnerReport | null
}

export async function ownStats(): Promise<OwnStats | null> {
  if (!visitsEnabled) return null
  const session = await getSession()
  if (!session) return null
  const report = await readOwner(visitDriver(), {
    site: SITE,
    owner: session.user.id,
    days: 30,
  })
  return {
    views: report.views,
    hits: report.hits,
    detail: isAdmin(session.user.id) ? report : null,
  }
}

/** The signed-in user approving or refusing the CLI's sign-in that `code` names
 *  (lib/api-keys). An account with no address yet (one just made, its provider's
 *  name taken) gives `username` in the same press: the CLI's links live under
 *  it. `gone` where no sign-in waits under the code (answered, or too old). */
export async function answerCliLogin(
  code: string,
  approve: boolean,
  username?: string,
): Promise<{ ok: true } | { ok: false; gone: boolean; why: string }> {
  const user = await requireUser()
  if (approve && !user.username) {
    if (!username)
      return { ok: false, gone: false, why: "Pick your address first." }
    try {
      await renameTo(user, username)
    } catch (error) {
      return { ok: false, gone: false, why: renameError(error) }
    }
  }
  return (await answerLogin(code, user.id, approve))
    ? { ok: true }
    : {
        ok: false,
        gone: true,
        why: "That sign-in is gone: run eid login again.",
      }
}

/** The signed-in user's keys, for /cli. */
export async function myKeys() {
  return keysOf((await requireUser()).id)
}

/** Revokes one of the signed-in user's keys: whatever holds it is signed out. */
export async function revokeMyKey(id: string): Promise<void> {
  const user = await requireUser()
  if (!(await revokeKey(user.id, id)))
    throw new Error(`revokeMyKey: ${id} is not a key of ${user.id}'s`)
}

/** The signed-in user asking to be told when Pro opens (`want`), or taking
 *  it back: whether they are asking now. */
export async function wantPro(want: boolean): Promise<boolean> {
  const user = await requireUser()
  if (want)
    await db
      .insert(proInterest)
      .values({ user_id: user.id, created_at: new Date() })
      .onConflictDoNothing()
  else await db.delete(proInterest).where(eq(proInterest.user_id, user.id))
  return want
}

/** An admin taking a link down (it opens nothing and leaves the card) or
 *  putting it back up, whatever took it down. Anyone else: a throw. */
export async function setLinkUp(id: string, up: boolean): Promise<void> {
  const user = await requireUser()
  if (!isAdmin(user.id)) throw new Error(`setLinkUp: ${user.id} is no admin`)
  const [row] = await db
    .update(links)
    .set(
      up
        ? { stopped_at: null, stopped_why: null }
        : { stopped_at: new Date(), stopped_why: "admin" },
    )
    .where(eq(links.id, id))
    .returning({ owner: links.user_id })
  if (!row) throw new Error(`setLinkUp: no link ${id}`)
  if (row.owner) updateTag(profileTag(row.owner))
}
