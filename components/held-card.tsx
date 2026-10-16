"use client"

import { type Holder, IdCard } from "@/components/id-card"
import { SubjectLight } from "@/components/light"
import { HoloLean, HoloLight } from "@/components/ui/holo"

/** A person's card standing on a page of theirs that is not their profile (a link's
 *  preview, the CLI's page): the profile's own card, lit as the page's subject, the
 *  laminate leaning to the hand; pressed, it opens their page. */
export function HeldCard({ holder }: { holder: Holder }) {
  return (
    <HoloLight className="relative">
      <SubjectLight />
      <HoloLean pose="flat" className="max-lg:[transform:none]">
        <IdCard
          holder={holder}
          heading="p"
          holo="laminate"
          className="[--id-card-thickness:1]"
          press={{
            href: `/${holder.username}`,
            label: `${holder.name ?? `@${holder.username}`}'s page`,
          }}
        />
      </HoloLean>
    </HoloLight>
  )
}
