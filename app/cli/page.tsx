import type { Metadata } from "next"
import { Suspense } from "react"
import { Approve, CliSignIn, Keys } from "@/app/cli/parts"
import { Wide } from "@/components/frame"
import { HeldCard } from "@/components/held-card"
import { SUBJECT } from "@/components/profile-layout"
import { SubjectHead } from "@/components/subject"
import { Code } from "@/components/ui/code"
import { InlineCode } from "@/components/ui/code-inline"
import { Panel } from "@/components/ui/panel"
import { keysOf, loginNamed } from "@/lib/api-keys"
import { cardLinkOf, getProfile, getPublicLinks } from "@/lib/data"
import { getSession } from "@/lib/session"

// THE `eid` CLI'S PAGE: where its sign-in is approved (`eid login` opens
// /cli?code=WXYZ-BCDF, lib/api-keys), and where every key it was given is listed
// and revoked. Signed out, it asks to sign in first and comes back to the code.
// Laid out as a page about one thing of a person's (components/profile-layout
// `SUBJECT`): the card of the account the CLI acts for, and the CLI.

export const metadata: Metadata = {
  title: "the eid CLI",
  robots: { index: false, follow: false },
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  return (
    <Wide>
      <main className={SUBJECT.grid}>
        <Suspense fallback={null}>
          <Body searchParams={searchParams} />
        </Suspense>
      </main>
    </Wide>
  )
}

/** What the CLI is and how it is had, for a page that is not approving a code. */
function Install() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-foreground/60 text-lg">
        Install it, then sign the machine in
      </h2>
      <Code compact lang="sh">
        npm i -g @e-id/eid
      </Code>
      <Code compact lang="sh">
        eid login
      </Code>
    </section>
  )
}

const HEAD = (
  <SubjectHead says="your e-ID from a terminal">the eid CLI</SubjectHead>
)

const LEAD = (
  <p className="max-w-prose text-foreground/70 text-lg">
    Short links, files sent and received, your card and your numbers, from any
    terminal, and for the agents working in it.
  </p>
)

async function Body({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const session = await getSession()
  if (!session)
    return (
      <>
        <aside className={SUBJECT.who}>
          <Panel bodyClassName="gap-4 p-6">
            <CliSignIn back={code ? `/cli?code=${code}` : "/cli"} />
          </Panel>
        </aside>
        <section className={SUBJECT.what}>
          {HEAD}
          {LEAD}
          {!code && <Install />}
        </section>
      </>
    )
  const username = session.user.username
  const profile = username ? await getProfile(username) : null
  const waiting = code ? await loginNamed(code) : null
  const keys = await keysOf(session.user.id)
  return (
    <>
      <aside className={SUBJECT.who}>
        {profile && username ? (
          <HeldCard
            holder={{
              name: profile.name,
              username,
              image: profile.image,
              country: profile.country_code,
              bio: profile.bio,
              links: (await getPublicLinks(profile.id)).map(cardLinkOf),
            }}
          />
        ) : (
          <Panel bodyClassName="p-6">
            <p className="text-foreground/70">
              Your account has no address yet: you pick one as you approve.
            </p>
          </Panel>
        )}
      </aside>
      <section className={SUBJECT.what}>
        {HEAD}
        {code ? (
          <Panel bodyClassName="gap-5 p-6">
            {waiting ? (
              <Approve
                code={code.toUpperCase()}
                host={waiting.host}
                // An account with no address yet picks one in the same press,
                // offered its email's name to start from.
                name={
                  username
                    ? null
                    : (session.user.email
                        .split("@")[0]
                        ?.toLowerCase()
                        .replace(/[^a-z0-9_-]/g, "") ?? "")
                }
              />
            ) : (
              <p className="text-foreground/70 text-lg">
                No sign-in waits under{" "}
                <InlineCode>{code.toUpperCase()}</InlineCode>: it was answered,
                or took longer than ten minutes. Run{" "}
                <InlineCode>eid login</InlineCode> again.
              </p>
            )}
          </Panel>
        ) : (
          <>
            {LEAD}
            <Install />
          </>
        )}
        <Keys
          keys={keys.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            created: k.created_at.toISOString(),
            used: k.last_used_at?.toISOString() ?? null,
          }))}
        />
      </section>
    </>
  )
}
