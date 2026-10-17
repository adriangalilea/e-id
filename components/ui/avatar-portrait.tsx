"use client"

// A CLIENT COMPONENT, because it hands the lightbox a `render` element. An element
// created in a server component and passed as a prop across the boundary arrives without
// its props during prerender (`element.props` is undefined and the trigger's own assert
// throws), so the element has to be made on the same side as the trigger that clones it.
//
// A FACE WORTH A CLOSER LOOK: the avatar (the same look, `avatarLook`), and a press opens
// the full portrait ALONE (`LightboxSolo`: its own provider, so three faces on a page are
// three viewers, never a reel with a strip and arrows), with the person's name as the
// caption (the lightbox's figcaption fallback would read a quote's whole attribution).
// Needs nothing above it. The lightbox's code loads only once a face is on the page,
// after the page is live, the plain face standing in until it has. A face that never
// opens is `avatar`, which installs nothing else.
//
// NO SUSPENSE AROUND THE TRIGGER. A lazy component rendered in the page leaves a
// Suspense boundary dehydrated until its code arrives, and every change from above
// (a feed placing its cards, a count arriving) asks React to hydrate each such
// boundary at once: a feed of forty faces resized while loading hit React's limit of
// nested updates. The server draws the plain face; the trigger takes its place once
// the code is here.

import * as React from "react"
import {
  AvatarImage,
  type AvatarProps,
  avatarLook,
} from "@/components/ui/avatar"
import type { Entry, LightboxSolo as Solo } from "@/components/ui/lightbox"

/** The lightbox's opener, once its code has loaded: one import for every face. */
let loading: Promise<typeof Solo> | null = null
const loadSolo = () => {
  loading ??= import("@/components/ui/lightbox").then((m) => m.LightboxSolo)
  return loading
}

export interface AvatarPortraitProps extends AvatarProps {
  /** The original, worth opening: the avatar opens it, alone. */
  full: { src: string; width: number; height: number }
}

export function AvatarPortrait({
  src,
  alt,
  full,
  ...look
}: AvatarPortraitProps) {
  const { className, style } = avatarLook({
    ...look,
    className: `cursor-zoom-in ${look.className ?? ""}`,
  })
  const [LightboxSolo, setSolo] = React.useState<typeof Solo | null>(null)
  React.useEffect(() => {
    let live = true
    void loadSolo().then((loaded) => {
      if (live) setSolo(() => loaded)
    })
    return () => {
      live = false
    }
  }, [])
  if (!LightboxSolo)
    return (
      <span data-slot="avatar" className={className} style={style}>
        <AvatarImage src={src} alt={alt} />
      </span>
    )
  const entry: Entry = {
    id: `avatar:${full.src}`,
    media: {
      kind: "image",
      source: { src, full: full.src, width: full.width, height: full.height },
      alt,
    },
    caption: alt,
  }
  return (
    <LightboxSolo
      entry={entry}
      label="portrait"
      render={
        <a
          data-slot="avatar"
          href={full.src}
          className={className}
          style={style}
          aria-label={alt}
        />
      }
    >
      {/* Decorative inside the trigger: the trigger carries the name. */}
      <AvatarImage src={src} alt="" />
    </LightboxSolo>
  )
}
