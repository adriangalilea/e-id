import { ArrowRight, ShieldCheck, ShieldQuestion } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import type * as React from "react"
import { Suspense } from "react"
import { Wide } from "@/components/frame"
import { HeldCard } from "@/components/held-card"
import { SUBJECT } from "@/components/profile-layout"
import { SubjectHead } from "@/components/subject"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Code } from "@/components/ui/code"
import { bytes } from "@/lib/bytes"
import {
  cardLinkOf,
  getProfile,
  getPublicLinks,
  type Profile,
  readOwnLink,
} from "@/lib/data"
import { LINK_SLUG, platformNamed } from "@/lib/link-names"
import { ANYWHERE } from "@/lib/link-safety"
import { threatOf } from "@/lib/safe-browsing"
import { peekSend, sendShownAt } from "@/lib/sends"
import { getSession } from "@/lib/session"
import {
  ADVISORY,
  isThreat,
  type Threat,
  takenDown,
  WARNINGS,
} from "@/lib/threats"
import { type Unsure, unsureOf } from "@/lib/trust"
import { hostOf, hrefOf } from "@/lib/web-preview-facts"
import { Peek } from "./peek"

// A LINK'S PREVIEW, `/you/<name>+` (proxy.ts rewrites it here): whose link it is,
// where it goes, whether it still opens, and what Google Safe Browsing says of
// it now (asked as the page is shown: a warning stands only on a fresh answer,
// lib/threats), with the way on unless it warns. Nothing is counted and no open
// is used: anyone who distrusts a link can look before opening it, and a
// one-use link survives being looked at. The way on is a form posted to the
// link's route, which counts the open there.
//
// It is also where a link e-ID is not sure of opens first (lib/trust `unsureOf`,
// app/[username]/[link]): the page says why it was shown.
//
// Laid out as the person's profile is (components/profile-layout `SUBJECT`): their
// card, and the one link.

/** What a link preview says of this address: a send's file and who sends it (only
 *  that it is a file, behind a password), or whose link it is. Never e-ID's own line:
 *  whoever reads a preview of someone's link is reading about that link. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; link: string }>
}): Promise<Metadata> {
  const { username, link } = await params
  const robots = { index: false, follow: false }
  const send = await sendShownAt(username, link)
  if (send)
    return send.file
      ? {
          title: { absolute: `${send.file.name} from ${send.from.name}` },
          description: `${bytes(send.file.size)}, straight from ${send.from.name}'s machine while they send it.`,
          robots,
        }
      : {
          title: { absolute: `a file from ${send.from.name}` },
          description:
            "Behind a password: its name and size are shown to whoever says it.",
          robots,
        }
  const profile = await getProfile(username)
  const whose = profile ? (profile.name ?? `@${profile.username}`) : username
  return {
    title: { absolute: `a link from ${whose}` },
    description: "See where it goes before it opens.",
    robots,
  }
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
    <Wide>
      <Suspense fallback={null}>
        <Preview params={params} />
      </Suspense>
    </Wide>
  )
}

/** Where `name` under a person goes, as the route would answer it, read without
 *  counting: a platform's link, one of their own, or nothing (their profile).
 *  `anywhere`: it goes where its owner wrote (lib/link-safety), so it is asked
 *  of Safe Browsing as the preview is shown, and may be one e-ID is not sure of. */
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
          checkedAt: link.checked_at,
        }
      : null
  }
  if (!LINK_SLUG.test(name.toLowerCase())) return null
  const own = await readOwnLink(userId, name)
  // A send goes nowhere: its value is a ticket, never shown as a destination.
  if (!own?.value || own.kind === "send") return null
  const why = own.stopped_why
    ? takenDown(own.stopped_why)
    : own.expires_at && own.expires_at.getTime() <= Date.now()
      ? `stopped opening on ${DAY.format(own.expires_at)}`
      : own.max_visits !== null && own.visits >= own.max_visits
        ? "used up: it opened as many times as it was made for"
        : null
  return { to: own.value, why, anywhere: true, checkedAt: own.checked_at }
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
  // Of this moment, never prerendered: Safe Browsing's answer and whether the link
  // still opens are read as it is shown.
  await connection()
  const { username, link: name } = await params
  const profile = await getProfile(username)
  if (!profile) notFound()
  const handle = profile.username ?? username
  const at = `/${handle}/${name.toLowerCase()}`
  const first = profile.name ?? `@${handle}`
  const card = <HeldCard holder={await holderOf(profile, handle)} />
  const own =
    !platformNamed(name) && LINK_SLUG.test(name.toLowerCase())
      ? await readOwnLink(profile.id, name)
      : null
  const down = own?.stopped_why ? takenDown(own.stopped_why) : null
  if (own?.kind === "send" && !own.addressed)
    return (
      <Split card={card}>
        <SendShown
          at={at}
          from={first}
          file={own.file}
          locked={own.locked}
          forYou={false}
          down={down}
        />
      </Split>
    )
  // A send for people shows itself to them alone, signed in (the route sent them
  // here): who sends what, before they take it. To anyone else it is a name of
  // theirs that opens nothing.
  if (own?.kind === "send" && own.addressed) {
    const session = await getSession()
    const peek = session
      ? await peekSend(handle, name, {
          userId: session.user.id,
          password: null,
        })
      : null
    if (peek?.ok)
      return (
        <Split card={card}>
          <SendShown
            at={at}
            from={first}
            file={peek.file}
            locked={false}
            forYou={peek.forYou}
            down={down}
          />
        </Split>
      )
  }
  const found = await destinationOf(profile.id, name)
  const [verdict, unsure] = found?.anywhere
    ? await Promise.all([
        verdictOf(found.to),
        found.why ? null : unsureOf(profile.id, found.checkedAt),
      ])
    : [null, null]
  return (
    <Split card={card}>
      {found ? (
        <LinkShown
          at={at}
          first={first}
          to={found.to}
          why={found.why}
          verdict={verdict}
          // Never answered until this page asked: a clean answer now is the one
          // it was waiting for.
          unsure={unsure === "unchecked" && verdict === "clean" ? null : unsure}
        />
      ) : (
        <>
          <SubjectHead
            at={`eid.to${at}`}
            says="opens nothing of theirs, so it goes to"
          >
            {first}&apos;s page
          </SubjectHead>
          <div>
            <Button
              size="xl"
              iconEnd={<ArrowRight />}
              render={<a href={`/${handle}`} />}
            >
              open their page
            </Button>
          </div>
        </>
      )}
    </Split>
  )
}

/** The card as their profile draws it: their face, names and public links. */
async function holderOf(profile: Profile, handle: string) {
  return {
    name: profile.name,
    username: handle,
    image: profile.image,
    country: profile.country_code,
    bio: profile.bio,
    links: (await getPublicLinks(profile.id)).map(cardLinkOf),
  }
}

/** WHO and WHAT: the person's card beside the one thing (components/profile-layout). */
function Split({
  card,
  children,
}: {
  card: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className={SUBJECT.grid}>
      <aside className={SUBJECT.who}>{card}</aside>
      <section className={SUBJECT.what}>{children}</section>
    </main>
  )
}

/** Why this preview stood in front of the link, said to whoever it stopped. */
const UNSURE: Record<Unsure, (first: string) => string> = {
  new: (first) =>
    `${first}'s account is new, under a week old, so e-ID shows where its links go before they open.`,
  unchecked: () =>
    "Google Safe Browsing has not answered for this address yet, so e-ID shows where it goes before it opens.",
}

/** A link that goes somewhere: where, in full; what Safe Browsing says of it now;
 *  why it was shown first, if it was; and the way on, unless it warns or stopped. */
function LinkShown({
  at,
  first,
  to,
  why,
  verdict,
  unsure,
}: {
  at: string
  first: string
  to: string
  why: string | null
  verdict: Threat | "clean" | "unasked" | null
  unsure: Unsure | null
}) {
  const warned = verdict && isThreat(verdict) ? verdict : null
  const host = hostOf(to)
  return (
    <>
      <SubjectHead at={`eid.to${at}`} says="goes to" under={to}>
        {host}
      </SubjectHead>
      {(verdict === "clean" || verdict === "unasked") && (
        <p className="flex max-w-prose gap-2.5 text-foreground/50 text-sm">
          {verdict === "clean" ? (
            <ShieldCheck className="mt-px size-4 shrink-0" />
          ) : (
            <ShieldQuestion className="mt-px size-4 shrink-0" />
          )}
          {verdict === "clean"
            ? "Checked with Google Safe Browsing just now: nothing found. A check like this can miss a bad page, or flag a good one."
            : "Google Safe Browsing could not be asked just now."}
        </p>
      )}
      {warned && (
        <Alert
          kind="destructive"
          title={WARNINGS[warned].says}
          className="max-w-prose"
        >
          <a href={WARNINGS[warned].more} className="underline">
            More about this
          </a>{" "}
          ·{" "}
          <a href={ADVISORY.url} className="underline">
            {ADVISORY.text}
          </a>
        </Alert>
      )}
      {why ? (
        <p className="text-foreground/70 text-lg first-letter:uppercase">
          {why}.
        </p>
      ) : warned ? null : (
        <div className="flex flex-col gap-5">
          {unsure && (
            <Alert
              kind="warning"
              title="Shown before it opens"
              className="max-w-prose"
            >
              {UNSURE[unsure](first)}
            </Alert>
          )}
          {/* Posted to the link's route, which counts the open and goes on. */}
          <form method="post" action={at}>
            <Button type="submit" size="xl" iconEnd={<ArrowRight />}>
              continue to {host}
            </Button>
          </form>
        </div>
      )}
    </>
  )
}

/** A send's page (lib/sends): what it is, from whom, and the one line that
 *  gets it, on any machine, account or not. */
function SendShown({
  at,
  from,
  file,
  locked,
  forYou,
  down,
}: {
  at: string
  from: string
  file: { name: string; size: number } | null
  /** Behind a password: what the file is is shown to whoever says it (Peek). */
  locked: boolean
  /** Sent to the person signed in: it waits in their inbox too. */
  forYou: boolean
  down: string | null
}) {
  if (!file) throw new Error(`the send at ${at} has no file`)
  const [, username = "", slug = ""] = at.split("/")
  const says = forYou ? "is sending you" : "is sending"
  return (
    <>
      {locked ? (
        <Peek at={`eid.to${at}`} says={says} username={username} slug={slug} />
      ) : (
        <SubjectHead at={`eid.to${at}`} says={says} under={bytes(file.size)}>
          {file.name}
        </SubjectHead>
      )}
      {down ? (
        <p className="text-foreground/70 text-lg first-letter:uppercase">
          {down}.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-foreground/60 text-lg">
            {forYou
              ? "Get it from a terminal signed in as you (it waits in eid inbox too)"
              : "Get it from a terminal, nothing to install"}
          </h2>
          <Code compact lang="sh">{`npx @e-id/eid get eid.to${at}`}</Code>
          <p className="max-w-prose text-foreground/45 text-sm">
            The file comes straight from {from}&apos;s machine, never through
            e-ID, so it is here only while they keep sending it. The two
            machines see each other&apos;s IP address.
          </p>
        </section>
      )}
    </>
  )
}
