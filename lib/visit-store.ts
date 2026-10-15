import "server-only"

import { libsqlDriver } from "@adriangalilea/utils/metrics/libsql"
import { createClient } from "@libsql/client"
import { parseChip } from "@/lib/chip"
import {
  EMOJI_DOMAIN_PUNYCODE,
  forbiddenUsernames,
  MAIN_DOMAIN,
  SHORT_DOMAIN,
} from "@/lib/const"
import { getProfile, renamedTo } from "@/lib/data"
import { forgetOwner, visitHits } from "@/lib/visits"

// e-id's visits, kept by the ui registry's visits (lib/visits) in the Turso database at
// VISITS_DATABASE_URL, apart from the site's own (the `visits_*` tables,
// provisioned once with VISITS_SCHEMA through the Turso CLI, never on a
// request). Off until VISITS_DATABASE_URL is set: the layout
// mounts no sensor, nothing posts to /api/events and no redirect is recorded. On,
// every page a person sees ends in one POST there, a function invocation, and every
// `/you/<name>` writes one row after answering.
//
// A person's pages are theirs by their user id (`ownerOf`), so a rename or an old
// name keeps one history; their own reading, as the display cookie says who they
// are, is never counted.

export const SITE = MAIN_DOMAIN

/** The same pages' other domains: Safari is sent to the emoji one, so most of an
 *  iPhone's visits are posted from there. */
export const DOMAINS = [SHORT_DOMAIN, EMOJI_DOMAIN_PUNYCODE]

export const visitsEnabled = Boolean(process.env.VISITS_DATABASE_URL)

let driver: ReturnType<typeof libsqlDriver> | undefined
export function visitDriver() {
  const url = process.env.VISITS_DATABASE_URL
  const authToken = process.env.VISITS_AUTH_TOKEN
  if (!url || !authToken)
    throw new Error(
      "visits: VISITS_DATABASE_URL and VISITS_AUTH_TOKEN are not set",
    )
  driver ??= libsqlDriver(createClient({ url, authToken }))
  return driver
}

/** The user a name is, under it or an old name of theirs; null for none. */
async function userNamed(name: string): Promise<string | null> {
  if (!name || forbiddenUsernames.includes(name.toLowerCase())) return null
  const profile = await getProfile(name)
  if (profile) return profile.id
  const now = await renamedTo(name)
  return now ? ((await getProfile(now))?.id ?? null) : null
}

/** Whose a page is: the person whose address it is under (`/adrian`,
 *  `/adrian/…`), by their user id; null for the site's own pages. */
export function ownerOf(_host: string, path: string): Promise<string | null> {
  return userNamed(path.split("/")[1] ?? "")
}

/** Who is reading, as the display cookie says (lib/chip): never trusted for
 *  anything but leaving a person's own reading uncounted. */
export function readerOf(request: Request): Promise<string | null> {
  const chip = parseChip(request.headers.get("cookie") ?? "")
  return chip?.u ? userNamed(chip.u) : Promise.resolve(null)
}

/** A person's numbers, forgotten with their account (auth.ts, before the user is
 *  deleted): everything counted for them, and the views of every address under
 *  `names`, their username and each old name (lib/username `namesOf`). */
export async function forgetPerson(
  userId: string,
  names: readonly string[],
): Promise<void> {
  await forgetOwner(visitDriver(), {
    site: SITE,
    owner: userId,
    paths: names.map((n) => `/${n}`),
  })
}

let recorder: ReturnType<typeof visitHits> | undefined
/** The recorder of `/you/<name>` redirects, built on the first one, so a build
 *  reads no credentials. */
export function hits(): ReturnType<typeof visitHits> {
  recorder ??= visitHits({
    db: visitDriver(),
    site: SITE,
    domains: DOMAINS,
    readerOf,
  })
  return recorder
}
