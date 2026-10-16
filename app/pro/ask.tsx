"use client"

import { useState, useTransition } from "react"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { Button } from "@/components/ui/button"
import { wantPro } from "@/db/actions"
import { startSignIn } from "@/lib/sign-in"

/** Asking to be told when Pro opens: signed in, one press (and one to take it
 *  back); signed out, the ways in first, coming back here. */
export function AskForPro({ asked }: { asked: boolean | null }) {
  const [now, setNow] = useState(asked)
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  if (now === null)
    return (
      <div className="flex flex-col gap-3">
        <p className="text-foreground/60 text-sm">
          Sign in to be told when Pro opens.
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
                startSignIn(p.id, "/pro").catch((error: unknown) => {
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
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={now ? "outline" : "default"}
        loading={pending}
        onClick={() =>
          start(async () => {
            setNow(await wantPro(!now))
          })
        }
      >
        {now ? "you will be told, take it back" : "tell me when Pro opens"}
      </Button>
      {now && (
        <span className="text-foreground/50 text-sm">
          One email, when it opens. Nothing else.
        </span>
      )}
    </div>
  )
}
