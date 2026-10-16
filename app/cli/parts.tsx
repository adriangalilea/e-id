"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { Button } from "@/components/ui/button"
import { InputGroup } from "@/components/ui/input"
import { answerCliLogin, revokeMyKey } from "@/db/actions"
import { startSignIn } from "@/lib/sign-in"

// /cli's hands: approving a sign-in, revoking a key, signing in first.

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
    <div className="flex flex-col gap-3">
      <p className="text-foreground/70 text-sm">
        Sign in to approve the CLI, with the account it should act for.
      </p>
      <div className="flex gap-2">
        {SIGN_IN_PROVIDERS.map((p) => (
          <Button
            key={p.id}
            variant="outline"
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
  const [answered, setAnswered] = useState<"yes" | "no" | null>(null)
  const [why, setWhy] = useState<string | null>(null)
  const [username, setUsername] = useState(name ?? "")
  const [pending, start] = useTransition()
  const answer = (approve: boolean) =>
    start(async () => {
      const done = await answerCliLogin(
        code,
        approve,
        name === null ? undefined : username,
      )
      if (done.ok) setAnswered(approve ? "yes" : "no")
      else setWhy(done.why)
    })
  if (answered)
    return (
      <p className="text-sm">
        {answered === "yes"
          ? "Done. Go back to your terminal: it is signed in."
          : "Refused. The terminal is told so."}
      </p>
    )
  return (
    <>
      <p className="text-foreground/70 text-sm">
        Sign in the eid CLI on{" "}
        <span className="font-mono text-foreground">{host}</span>? It will make,
        list and delete your short links and read your numbers.
      </p>
      <p className="text-foreground/60 text-xs">
        The terminal shows this code. Approve only if it is the same:
      </p>
      <span className="font-mono text-3xl tracking-widest">{code}</span>
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
        <Button loading={pending} onClick={() => answer(true)}>
          approve
        </Button>
        <Button
          variant="ghost"
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
      <p className="text-foreground/50 text-sm">
        No CLI is signed in to your account.
      </p>
    )
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-foreground/60 text-sm">signed in</h2>
      <ul className="flex flex-col">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-3 border-border border-t py-2 first:border-t-0"
          >
            <div className="flex min-w-0 grow flex-col">
              <span className="text-sm">{k.name}</span>
              <span className="font-mono text-foreground/45 text-xs">
                {k.prefix}… · made {DAY.format(new Date(k.created))} ·{" "}
                {k.used ? `used ${DAY.format(new Date(k.used))}` : "never used"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
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
