import "server-only"

import { isThreat, THREATS, type Threat } from "@/lib/threats"

// WHETHER AN ADDRESS IS KNOWN BAD, asked of Google's Web Risk (the lists behind
// Safe Browsing, for a product: the Safe Browsing API is for non-commercial use).
// Every address a person points a link of theirs at is asked when it is saved and
// again every day (app/api/cron/recheck): one listed is refused, or taken down
// once it turns bad, so a phishing page behind e-ID's domains is never left up
// long enough to have the domains listed with it (README). Its key in the
// deployment's environment (WEB_RISK_KEY), never here.

const WORDS: Record<Threat, string> = {
  MALWARE: "malware",
  SOCIAL_ENGINEERING: "phishing",
  UNWANTED_SOFTWARE: "unwanted software",
}

/** The threat Web Risk lists `url` under, or null for none. Throws when it cannot
 *  say (no key, Google failing): a link is never saved unasked. */
export async function threatOf(url: string): Promise<Threat | null> {
  const key = process.env.WEB_RISK_KEY
  if (!key) throw new Error("WEB_RISK_KEY is not set: links cannot be checked")
  const ask = new URL("https://webrisk.googleapis.com/v1/uris:search")
  for (const t of THREATS) ask.searchParams.append("threatTypes", t)
  ask.searchParams.set("uri", url)
  ask.searchParams.set("key", key)
  const res = await fetch(ask, { cache: "no-store" })
  if (!res.ok)
    throw new Error(
      `Web Risk on ${url}: HTTP ${res.status} ${await res.text()}`,
    )
  const body = (await res.json()) as { threat?: { threatTypes: string[] } }
  const found = body.threat?.threatTypes ?? []
  for (const t of found)
    if (!isThreat(t)) throw new Error(`Web Risk on ${url}: an unknown "${t}"`)
  return (found[0] as Threat | undefined) ?? null
}

/** Words for a person whose link was refused. */
export function refusal(threat: Threat): string {
  return `Google's Web Risk lists this address as ${WORDS[threat]}: e-ID will not link to it.`
}
