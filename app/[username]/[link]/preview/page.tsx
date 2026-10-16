import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Image } from "@/components/ui/image"
import { Panel } from "@/components/ui/panel"
import { cardLinkOf, getProfile, getPublicLinks, readOwnLink } from "@/lib/data"
import { LINK_SLUG, platformNamed } from "@/lib/link-names"
import { ANYWHERE } from "@/lib/link-safety"
import { threatOf } from "@/lib/safe-browsing"
import {
  ADVISORY,
  isThreat,
  type Threat,
  takenDown,
  WARNINGS,
} from "@/lib/threats"
import { hostOf, hrefOf } from "@/lib/web-preview-facts"

// A LINK'S PREVIEW, `/you/<name>+` (proxy.ts rewrites it here): whose link it is,
// where it goes, whether it still opens, and what Google Safe Browsing says of
// it now (asked as the page is shown: a warning stands only on a fresh answer,
// lib/threats), with the way on unless it warns. Nothing is counted and no open
// is used: anyone who distrusts a link can look before opening it, and a
// one-use link survives being looked at.

export const metadata: Metadata = {
  title: "where this link goes",
  robots: { index: false, follow: false },
}

const DAY = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export default function Page({
  params,
}: {
  params: Promise<{ username: string; link: string }>
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <Suspense fallback={null}>
        <Preview params={params} />
      </Suspense>
    </main>
  )
}

/** Where `name` under a person goes, as the route would answer it, read without
 *  counting: a platform's link, one of their own, or nothing (their profile).
 *  `anywhere`: it goes where its owner wrote (lib/link-safety), so it is asked
 *  of Safe Browsing as the preview is shown. */
async function destinationOf(userId: string, name: string) {
  const platform = platformNamed(name)
  if (platform) {
    const link = (await getPublicLinks(userId)).find(
      (l) => l.platform === platform && l.value,
    )
    return link
      ? {
          to: cardLinkOf(link).url,
          why: null,
          anywhere: ANYWHERE.includes(link.platform),
        }
      : null
  }
  if (!LINK_SLUG.test(name.toLowerCase())) return null
  const own = await readOwnLink(userId, name)
  if (!own?.value) return null
  const why = own.stopped_why
    ? takenDown(own.stopped_why)
    : own.expires_at && own.expires_at.getTime() <= Date.now()
      ? `stopped opening on ${DAY.format(own.expires_at)}`
      : own.max_visits !== null && own.visits >= own.max_visits
        ? "used up: it opened as many times as it was made for"
        : null
  return { to: own.value, why, anywhere: true }
}

/** Safe Browsing's answer for `to` now: a warning may be shown only on an
 *  answer still valid when shown (lib/threats), so the preview asks fresh.
 *  "unasked" where Google could not answer: said so, never read as clean. */
async function verdictOf(to: string): Promise<Threat | "clean" | "unasked"> {
  try {
    return (await threatOf(hrefOf(to))) ?? "clean"
  } catch (error) {
    console.error(`preview: Safe Browsing on ${to}:`, error)
    return "unasked"
  }
}

async function Preview({
  params,
}: {
  params: Promise<{ username: string; link: string }>
}) {
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()
  const found = await destinationOf(profile.id, name)
  const verdict = found?.anywhere ? await verdictOf(found.to) : null
  const warned = verdict && isThreat(verdict) ? verdict : null
  const at = `/${profile.username}/${name.toLowerCase()}`
  return (
    <>
      <a
        href={`/${profile.username}`}
        className="flex items-center gap-3 self-start"
      >
        {profile.image && (
          <Image
            src={profile.image}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
        )}
        <span className="flex flex-col">
          <span>{profile.name ?? profile.username}</span>
          <span className="font-mono text-foreground/50 text-xs">
            @{profile.username}
          </span>
        </span>
      </a>
      <Panel bodyClassName="gap-3 p-4">
        <span className="font-mono text-foreground/50 text-xs">{at}</span>
        {found ? (
          <>
            <span className="text-foreground/60 text-sm">goes to</span>
            <span className="font-medium text-lg">{hostOf(found.to)}</span>
            <span className="break-all font-mono text-foreground/70 text-xs">
              {found.to}
            </span>
            {verdict === "clean" && (
              <span className="text-foreground/45 text-xs">
                Checked with Google Safe Browsing just now: nothing found. A
                check like this can miss a bad page, or flag a good one.
              </span>
            )}
            {verdict === "unasked" && (
              <span className="text-foreground/45 text-xs">
                Google Safe Browsing could not be asked just now.
              </span>
            )}
          </>
        ) : (
          <span className="text-foreground/60 text-sm">
            opens nothing of theirs: it goes to their profile.
          </span>
        )}
      </Panel>
      {warned && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="text-destructive">{WARNINGS[warned].says}</p>
          <p className="text-foreground/50 text-xs">
            <a href={WARNINGS[warned].more} className="underline">
              More about this
            </a>{" "}
            ·{" "}
            <a href={ADVISORY.url} className="underline">
              {ADVISORY.text}
            </a>
          </p>
        </div>
      )}
      {found?.why ? (
        <p className="text-foreground/70 text-sm first-letter:uppercase">
          {found.why}.
        </p>
      ) : warned ? null : (
        <Button
          variant="outline"
          className="self-start"
          render={
            <a
              href={found ? found.to : `/${profile.username}`}
              rel="noopener noreferrer nofollow"
            />
          }
        >
          {found ? `continue to ${hostOf(found.to)}` : "open their profile"}
        </Button>
      )}
    </>
  )
}
