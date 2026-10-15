"use client"

import { Suspense, use } from "react"
import { WebPreview } from "@/components/ui/web-preview"
import { websiteOf } from "@/db/actions"
import type { Unfurl } from "@/lib/web-preview-facts"

// WHO OR WHAT IS BEHIND A MARK ON THE CARD, while the hand rests on it, for the marks
// that are no profile (id-card, `Flair`): a website as its preview's compact row
// (@ag/web-preview), read when the hand first comes. An email's needs nothing
// read (@ag/email-address, in id-card itself).

/** Each person's website read once per page, so a hover suspends on the same
 *  promise the next time. */
const sites = new Map<string, Promise<Unfurl | null>>()

function siteOf(username: string): Promise<Unfurl | null> {
  let site = sites.get(username)
  if (!site) {
    site = websiteOf(username)
    sites.set(username, site)
  }
  return site
}

function Website({ username, url }: { username: string; url: string }) {
  const facts = use(siteOf(username))
  // Their site would not answer: its address, which is what the mark opens.
  if (!facts) return <Plain url={url} />
  return <WebPreview facts={facts} style="compact" frame={false} />
}

/** The address alone, in the compact row's type, while the preview is read or
 *  when there is none. */
function Plain({ url }: { url: string }) {
  return (
    <p className="truncate font-sans text-current/60 text-sm">
      {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
    </p>
  )
}

/** A person's website behind its mark: the preview, its address until it is read. */
export function WebsiteHover({
  username,
  url,
}: {
  username: string
  url: string
}) {
  return (
    <Suspense fallback={<Plain url={url} />}>
      <Website username={username} url={url} />
    </Suspense>
  )
}
