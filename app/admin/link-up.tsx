"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { setLinkUp } from "@/db/actions"

/** A link's switch on the admin's list: on, it opens; off, it is taken down. */
export function LinkUp({ id, up }: { id: string; up: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Switch
      checked={up}
      disabled={pending}
      aria-label={up ? "up: take it down" : "taken down: put it back up"}
      onCheckedChange={(next) =>
        start(async () => {
          await setLinkUp(id, next)
          router.refresh()
        })
      }
    />
  )
}
