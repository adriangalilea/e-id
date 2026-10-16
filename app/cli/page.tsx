import type { Metadata } from "next"
import { Suspense } from "react"
import { Approve, CliSignIn, Keys } from "@/app/cli/parts"
import { Panel } from "@/components/ui/panel"
import { keysOf, loginNamed } from "@/lib/api-keys"
import { getSession } from "@/lib/session"

// THE `eid` CLI'S PAGE: where its sign-in is approved (`eid login` opens
// /cli?code=WXYZ-BCDF, lib/api-keys), and where every key it was given is listed
// and revoked. Signed out, it asks to sign in first and comes back to the code.

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">the eid CLI</h1>
        <p className="text-foreground/60 text-sm">
          Your short links and your numbers from a terminal.{" "}
          <code className="font-mono text-foreground/80">
            npm i -g @e-id/eid
          </code>
          , then <code className="font-mono text-foreground/80">eid login</code>
          .
        </p>
      </header>
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Body({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const session = await getSession()
  if (!session) return <CliSignIn back={code ? `/cli?code=${code}` : "/cli"} />
  const waiting = code ? await loginNamed(code) : null
  const keys = await keysOf(session.user.id)
  return (
    <>
      {code && (
        <Panel bodyClassName="gap-4 p-4">
          {waiting ? (
            <Approve
              code={code.toUpperCase()}
              host={waiting.host}
              // An account with no address yet picks one in the same press,
              // offered its email's name to start from.
              name={
                session.user.username
                  ? null
                  : (session.user.email
                      .split("@")[0]
                      ?.toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "") ?? "")
              }
            />
          ) : (
            <p className="text-foreground/70 text-sm">
              No sign-in waits under {code.toUpperCase()}: it was answered, or
              took longer than ten minutes. Run{" "}
              <code className="font-mono">eid login</code> again.
            </p>
          )}
        </Panel>
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
    </>
  )
}
