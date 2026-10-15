"use client"

import { useEffect, useId, useState } from "react"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { startSignIn } from "@/lib/sign-in"

// DELETING YOUR ACCOUNT, from the account menu (components/footer): typed out, then
// done by better-auth from a session signed in minutes ago (auth.ts, `freshAge`),
// which also says what goes with it. An older session is asked to sign in again
// first: the sign-in comes back here (`?delete-account`), the dialog open.

/** The address a sign-in comes back to, to finish deleting. */
export const DELETE_PARAM = "delete-account"

export function DeleteAccount({
  username,
  open,
  onOpenChange,
}: {
  /** What they type to confirm: their username, or "delete" with none yet. */
  username: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const word = username ?? "delete"
  const field = useId()
  const [typed, setTyped] = useState("")
  const [state, setState] = useState<"ready" | "deleting" | "stale" | "failed">(
    "ready",
  )

  const remove = async () => {
    setState("deleting")
    const { error } = await authClient.deleteUser({})
    if (!error) {
      window.location.href = "/"
      return
    }
    if (error.code === "SESSION_EXPIRED") setState("stale")
    else {
      console.error("delete account:", error)
      setState("failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>delete your account</DialogTitle>
          <DialogDescription>
            Your page, your card, your links, your vouches (on your page and the
            ones you wrote) and your numbers go now, for good. Your address
            {username ? ` (${username})` : ""} and your old ones stay
            unclaimable for 90 days, so links people still have open nobody
            else.
          </DialogDescription>
        </DialogHeader>
        {state === "stale" ? (
          <>
            <p className="text-sm">
              To be sure it is you, sign in again; you come back here to finish.
            </p>
            <DialogFooter>
              {SIGN_IN_PROVIDERS.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  icon={p.icon}
                  onClick={() =>
                    startSignIn(
                      p.id,
                      `${window.location.pathname}?${DELETE_PARAM}`,
                    )
                  }
                >
                  {p.label}
                </Button>
              ))}
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2 text-sm">
              <label htmlFor={field}>
                type <span className="font-mono">{word}</span> to confirm
              </label>
              <Input
                id={field}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {state === "failed" && (
              <p className="text-sm text-tone-bad">
                It could not be deleted. Nothing was removed; try again.
              </p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                cancel
              </Button>
              <Button
                variant="destructive"
                disabled={typed.trim().toLowerCase() !== word.toLowerCase()}
                loading={state === "deleting"}
                onClick={remove}
              >
                delete for good
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Whether this page was reached to finish deleting (`?delete-account`): read
 *  once, and the address cleaned so a reload does not ask again. */
export function useDeleteReturn(): boolean {
  const [back, setBack] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(DELETE_PARAM)) return
    url.searchParams.delete(DELETE_PARAM)
    window.history.replaceState(window.history.state, "", url)
    setBack(true)
  }, [])
  return back
}
