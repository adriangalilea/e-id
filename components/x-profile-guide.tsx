"use client"

import { ArrowDown } from "lucide-react"
import { Copy } from "@/components/ui/copy"
import { XProfile, XProfileField } from "@/components/ui/x-profile"
import { urlOf } from "@/lib/addresses"
import { XLogo } from "@/lib/brand-icons"
import { EMOJI_DOMAIN } from "@/lib/const"

// YOUR ADDRESS ON YOUR X PROFILE, shown: X's website field refuses the emoji
// ("Url can't include invalid characters"), takes it spelled out, and shows it
// back as 👤.to (lib/addresses CHECKED). So the guide is the field as X draws it,
// holding the address to paste with its copy, and the person's own profile as it
// will look with it (ui x-profile): their name, their face, their handle on X
// where their card has one. No counts: the guide does not know them.

export type GuideHolder = {
  username: string
  name: string | null
  image: string | null
  /** Their handle on X, from their card's link; none, their e-ID name. */
  x: string | null
}

export function XProfileGuide({ holder }: { holder: GuideHolder }) {
  const path = `/${holder.username}`
  const value = urlOf("spelled", path)
  const handle = (holder.x ?? holder.username).replace(/^@/, "")
  return (
    <figure className="flex flex-col gap-2.5">
      <figcaption className="flex items-center gap-1.5 text-foreground/70 text-xs">
        <XLogo className="size-3 opacity-60" />
        on your X profile
      </figcaption>
      <div className="flex items-center gap-2">
        <XProfileField label="Website" value={value} className="grow" />
        <Copy value={value} className="size-9 shrink-0 rounded-full" />
      </div>
      <ArrowDown aria-hidden className="mx-auto size-3.5 text-foreground/40" />
      <XProfile
        own
        profile={{
          url: `https://x.com/${handle}`,
          author: {
            name: holder.name ?? holder.username,
            handle: `@${handle}`,
            avatar: holder.image ?? "/icon.svg",
          },
          bio: [],
          website: { text: `${EMOJI_DOMAIN}${path}`, href: value },
        }}
        className="text-[13px]"
      />
      <p className="text-foreground/45 text-xs">
        Paste it in Edit profile › Website. X refuses the emoji there, but takes
        it spelled out and shows {EMOJI_DOMAIN}.
      </p>
    </figure>
  )
}
