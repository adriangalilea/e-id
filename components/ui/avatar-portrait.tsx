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
// Needs nothing above it. The lightbox's code loads only once a face is on the page (a
// lazy import, the plain face standing in until it has). A face that never opens is
// `avatar`, which installs nothing else.

import * as React from "react"
import {
  AvatarImage,
  type AvatarProps,
  avatarLook,
} from "@/components/ui/avatar"
import type { Entry } from "@/components/ui/lightbox"

const LightboxSolo = React.lazy(() =>
  import("@/components/ui/lightbox").then((m) => ({
    default: m.LightboxSolo,
  })),
)

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
  const plain = (
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
    <React.Suspense fallback={plain}>
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
    </React.Suspense>
  )
}
