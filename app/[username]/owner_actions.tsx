"use client"

import { Pen } from "lucide-react"
import { useOwnCard } from "@/components/profile-card"
import { ShortLinks } from "@/components/short-links"
import { Button } from "@/components/ui/button"
import type { GuideHolder } from "@/components/x-profile-guide"
import { OwnStats } from "./own_stats"
import ShareButton from "./share_button"

/** Share and edit, and their numbers under them, for the profile's owner as the
 *  display cookie remembers them (components/profile-card, `useOwnCard`). Edit
 *  takes up the card itself; saving and the numbers check the real session. */
export function OwnerActions({ holder }: { holder: GuideHolder }) {
  const own = useOwnCard()
  if (!own) return null
  const { username } = holder

  return (
    <div className="flex animate-fade-in flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <ShareButton holder={holder} />
        <Button
          variant="outline"
          size="lg"
          loading={own.opening}
          onClick={own.open}
          icon={<Pen strokeWidth={1.5} />}
        >
          edit
        </Button>
        <ShortLinks username={username} />
      </div>
      <OwnStats />
    </div>
  )
}
