import "server-only"

import { isThreat, type Threat } from "@/lib/threats"

// WHETHER AN ADDRESS IS KNOWN BAD, asked of Google Safe Browsing (v5,
// `urls:search`). Every address a person points a link of theirs at is asked when
// it is saved and again every day (app/api/cron/recheck): one listed is refused,
// or taken down once it turns bad, so a phishing page behind e-ID's domains is
// never left up long enough to have the domains listed with it (README). Its key
// in the deployment's environment (SAFE_BROWSING_KEY), never here.
//
// Safe Browsing is for non-commercial use ("for sale or revenue-generating
// purposes" is commercial): e-ID sells nothing today. The day it takes money
// (README, Premium › billing) this moves to Web Risk, the same lists under a
// commercial licence, which is `uris:search` with one `threatTypes` per threat:
// this file and its key, nothing else.
//
// One address a question, though up to 50 are allowed: an answer may name a
// broader expression than was asked (the host, a shorter path), and with one
// address asked, any threat in it is that address's.

const WORDS: Record<Threat, string> = {
  MALWARE: "malware",
  SOCIAL_ENGINEERING: "phishing",
  UNWANTED_SOFTWARE: "unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "a harmful app",
}

/** The threat Safe Browsing lists `url` under, or null for none. Throws when it
 *  cannot say (no key, Google failing): a link is never saved unasked. */
export async function threatOf(url: string): Promise<Threat | null> {
  const key = process.env.SAFE_BROWSING_KEY
  if (!key)
    throw new Error("SAFE_BROWSING_KEY is not set: links cannot be checked")
  const ask = new URL("https://safebrowsing.googleapis.com/v5/urls:search")
  ask.searchParams.set("urls", url)
  ask.searchParams.set("key", key)
  const res = await fetch(ask, { cache: "no-store" })
  if (!res.ok)
    throw new Error(
      `Safe Browsing on ${url}: HTTP ${res.status} ${await res.text()}`,
    )
  const body = (await res.json()) as {
    threats?: { url: string; threatTypes: string[] }[]
  }
  const found = (body.threats ?? []).flatMap((t) => t.threatTypes)
  for (const t of found)
    if (!isThreat(t))
      throw new Error(`Safe Browsing on ${url}: an unknown threat "${t}"`)
  return (found[0] as Threat | undefined) ?? null
}

/** Words for a person whose link was refused. */
export function refusal(threat: Threat): string {
  return `Google Safe Browsing lists this address as ${WORDS[threat]}: e-ID will not link to it.`
}
