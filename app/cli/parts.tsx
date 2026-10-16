"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { Button } from "@/components/ui/button"
import { InlineCode } from "@/components/ui/code-inline"
import { InputGroup } from "@/components/ui/input"
import { answerCliLogin, cliLoginTaken, revokeMyKey } from "@/db/actions"
import { startSignIn } from "@/lib/sign-in"

// /cli's hands: approving a sign-in, revoking a key, signing in first.

/** How long an approved sign-in waits for its terminal before the page says it did not
 *  come: a running `eid login` asks every 3 s, so a minute is a terminal that stopped. */
const TAKE_WITHIN_MS = 60_000

const DAY = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** Signed out: the ways in, coming back to `back` (the code, still waiting). */
export function CliSignIn({ back }: { back: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/70 text-lg">
        Sign in with the account the CLI should act for.
      </p>
      <div className="flex flex-wrap gap-2">
        {SIGN_IN_PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            size="lg"
            icon={p.icon}
            loading={busy === p.id}
            onClick={() => {
              setBusy(p.id)
              startSignIn(p.id, back).catch((error: unknown) => {
                setBusy(null)
                throw error
              })
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** A sign-in waiting: the code to compare with the terminal's, and the answer.
 *  `name`: the address offered to an account that has none yet (null where it
 *  has one), picked in the same press as approving. */
export function Approve({
  code,
  host,
  name,
}: {
  code: string
  host: string
  name: string | null
}) {
  const router = useRouter()
  const [answered, setAnswered] = useState<
    "approved" | "taken" | "untaken" | "refused" | null
  >(null)
  const [why, setWhy] = useState<string | null>(null)
  const [username, setUsername] = useState(name ?? "")
  const [pending, start] = useTransition()
  // Approved is not signed in: the key is made when the terminal next asks for it
  // (every LOGIN_INTERVAL_S). Asked every second until it has, then the list below
  // is read again with the new machine in it.
  useEffect(() => {
    if (answered !== "approved") return
    const until = Date.now() + TAKE_WITHIN_MS
    const timer = window.setInterval(async () => {
      if (await cliLoginTaken(code)) {
        window.clearInterval(timer)
        setAnswered("taken")
        router.refresh()
      } else if (Date.now() > until) {
        window.clearInterval(timer)
        setAnswered("untaken")
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [answered, code, router])
  const answer = (approve: boolean) =>
    start(async () => {
      const done = await answerCliLogin(
        code,
        approve,
        name === null ? undefined : username,
      )
      if (done.ok) setAnswered(approve ? "approved" : "refused")
      else setWhy(done.why)
    })
  if (answered)
    return (
      <p className="text-lg">
        {
          {
            approved: `Approved. Waiting for the terminal on ${host} to take its key…`,
            taken: `Done. The terminal on ${host} is signed in.`,
            untaken: `Approved, but the terminal on ${host} has not come for its key: if it stopped, run eid login again.`,
            refused: "Refused. The terminal is told so.",
          }[answered]
        }
      </p>
    )
  return (
    <>
      <p className="text-xl">
        Sign in the eid CLI on <InlineCode>{host}</InlineCode>?
      </p>
      <p className="max-w-prose text-foreground/60">
        It will act for you: make and delete your short links, send files and
        take what is sent to you, change your card and read your numbers.
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-foreground/60 text-sm">
          The terminal shows this code. Approve only if it is the same:
        </span>
        <span className="font-mono text-5xl tracking-widest">{code}</span>
      </div>
      {name !== null && (
        <div className="flex flex-col gap-1.5">
          <span id="cli-address" className="text-foreground/60 text-xs">
            your address
          </span>
          <InputGroup
            aria-labelledby="cli-address"
            prefix="eid.to/"
            value={username}
            spellCheck={false}
            autoCapitalize="none"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      )}
      {why && <p className="text-destructive text-sm">{why}</p>}
      <div className="flex gap-2">
        <Button size="xl" loading={pending} onClick={() => answer(true)}>
          approve
        </Button>
        <Button
          variant="ghost"
          size="xl"
          disabled={pending}
          onClick={() => answer(false)}
        >
          refuse
        </Button>
      </div>
    </>
  )
}

export type KeyRow = {
  id: string
  name: string
  prefix: string
  created: string
  used: string | null
}

/** Every key the CLI was given, each revocable. */
export function Keys({ keys }: { keys: KeyRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (keys.length === 0)
    return (
      <p className="text-foreground/50">No CLI is signed in to your account.</p>
    )
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-foreground/60 text-lg">signed in</h2>
      <ul className="flex flex-col">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-3 border-border border-t py-3 first:border-t-0"
          >
            <div className="flex min-w-0 grow flex-col gap-0.5">
              <span>{k.name}</span>
              <span className="font-mono text-foreground/45 text-sm">
                {k.prefix}… · made {DAY.format(new Date(k.created))} ·{" "}
                {k.used ? `used ${DAY.format(new Date(k.used))}` : "never used"}
              </span>
            </div>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await revokeMyKey(k.id)
                  router.refresh()
                })
              }
            >
              revoke
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
