import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"
import { cacheLife } from "next/cache"
import { db } from "@/db"
import { accounts, links, users } from "@/db/schema"
import { MOST_SHORT_LINKS } from "@/lib/card-edit"

// HOW MANY LINKS OF THEIR OWN A PERSON MAY KEEP (`link` rows, on the card or
// short links: both are a redirect at /you/<name> to wherever they wrote). An
// account costs nothing to make (a GitHub or Google sign-in), so the allowance
// is what time and a clean record earn, never what an account is given: one
// link on the first day, more as the account ages, the whole MOST_SHORT_LINKS
// after three months. A GitHub account a year old or more is a person who did
// not sign up yesterday to send one phishing link: their account counts a week
// older. A link of theirs taken down (lib/web-risk, or an admin) freezes it at
// what they have until it is put back. Read where a link is written, and shown
// in the short links list with when the next step comes.

const DAY = 24 * 60 * 60 * 1000

/** What an account of each age may keep, from its first day. */
const STEPS = [
  { days: 0, most: 1 },
  { days: 7, most: 10 },
  { days: 30, most: 50 },
  { days: 90, most: MOST_SHORT_LINKS },
] as const

/** How much older a GitHub account at least a year old makes an e-ID one. */
const GITHUB_VOUCH_DAYS = 7
const GITHUB_OLD_DAYS = 365

export type Allowance = {
  /** Links of their own they may keep now. */
  most: number
  /** Why it is what it is, for the person. */
  why: string
  /** When it grows, and to what; null at the top or while frozen. */
  next: { most: number; on: string } | null
}

/** When a GitHub account was made, by its numeric id (what better-auth keeps):
 *  null where GitHub does not say. Days old accounts never get younger: kept
 *  for good. */
async function githubSince(id: string): Promise<Date | null> {
  "use cache"
  const token = process.env.API_GITHUB_TOKEN
  try {
    const res = await fetch(`https://api.github.com/user/${id}`, {
      headers: {
        accept: "application/vnd.github+json",
        ...(token && { authorization: `Bearer ${token}` }),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { created_at } = (await res.json()) as { created_at: string }
    cacheLife("max")
    return new Date(created_at)
  } catch (error) {
    // GitHub failing takes the head start away for minutes, never the link.
    console.error(`trust: GitHub account ${id}:`, error)
    cacheLife("minutes")
    return null
  }
}

/** What `userId` may keep now (`now` in ms since the epoch). */
export async function allowanceOf(
  userId: string,
  now = Date.now(),
): Promise<Allowance> {
  const [[user], github, stopped] = await Promise.all([
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId)),
    db
      .select({ id: accounts.accountId })
      .from(accounts)
      .where(
        and(eq(accounts.userId, userId), eq(accounts.providerId, "github")),
      ),
    db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.user_id, userId), isNotNull(links.stopped_at)))
      .limit(1),
  ])
  if (!user) throw new Error(`allowanceOf: no user ${userId}`)
  if (stopped.length > 0)
    return {
      most: 0,
      why: "A link of yours was taken down: no new ones until it is reviewed.",
      next: null,
    }
  const since = github[0] ? await githubSince(github[0].id) : null
  const vouched =
    since !== null && now - since.getTime() >= GITHUB_OLD_DAYS * DAY
  const start =
    user.createdAt.getTime() - (vouched ? GITHUB_VOUCH_DAYS * DAY : 0)
  const age = (now - start) / DAY
  const at = STEPS.findLastIndex((s) => age >= s.days)
  const step = STEPS[at]
  if (!step) throw new Error(`allowanceOf: an account ${age} days old`)
  const after = STEPS[at + 1]
  return {
    most: step.most,
    why:
      step.most === MOST_SHORT_LINKS
        ? `You keep ${MOST_SHORT_LINKS} links of your own at most.`
        : `A new account keeps fewer links of its own: ${step.most} for now.`,
    next: after
      ? {
          most: after.most,
          on: new Date(start + after.days * DAY).toISOString().slice(0, 10),
        }
      : null,
  }
}
