import type * as React from "react"
import { cn } from "@/lib/utils"
import { Img } from "@/components/ui/img"

export type AvatarSize = "sm" | "md" | "lg"

export interface AvatarProps {
  /** The rendition the page paints. */
  src: string
  /** The person's name: the accessible name of the picture. */
  alt: string
  /** On the studio's rungs: 24, 40, 64 px. */
  size?: AvatarSize
  /** Where the subject sits across the picture, 0 to 1: the sidecar's number. */
  focus?: number
  /** The picture's own colour, for the hairline ring. */
  tone?: { accent: string } | null
  className?: string
}

/** Rungs of the 8·2ⁿ scale, in rem: a comment or a feed line, an attribution, a header. */
export const AVATAR_SIZES: Record<AvatarSize, string> = {
  sm: "1.5rem",
  md: "2.5rem",
  lg: "4rem",
}

/** A HAIRLINE IN THE PICTURE'S OWN COLOUR. On a dark ground a dark portrait has no edge;
 *  the ring gives it one, and taking the colour from the picture keeps it belonging to the
 *  picture rather than to the page. Without a tone it is the page's border. */
const RING = "ring-1 ring-(--ag-avatar-ink)/40"
const RING_PLAIN = "ring-1 ring-border/40"

/** The face's frame, as classes and custom properties: what an avatar and a portrait
 *  that opens wear alike. */
export function avatarLook({
  size = "md",
  focus = 0.5,
  tone,
  className,
}: Pick<AvatarProps, "size" | "focus" | "tone" | "className">): {
  className: string
  style: React.CSSProperties
} {
  return {
    className: cn(
      "inline-block flex-none size-(--ag-avatar-size) overflow-hidden rounded-full align-middle",
      tone ? RING : RING_PLAIN,
      className,
    ),
    style: {
      "--ag-avatar-size": AVATAR_SIZES[size],
      // The whole object-position, so the class consumes one value.
      "--ag-avatar-focus": `${(focus * 100).toFixed(1)}% 50%`,
      ...(tone ? { "--ag-avatar-ink": tone.accent } : {}),
    } as React.CSSProperties,
  }
}

/** The picture itself, POSITIONED ON THE SUBJECT, not on the middle of the file. Named
 *  by `alt` on its own; inside a control that carries the name, pass `alt=""`. */
export function AvatarImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Img
      data-slot="avatar-image"
      className="block size-full object-cover object-(--ag-avatar-focus)"
      src={src}
      alt={alt}
      width={64}
      height={64}
      loading="lazy"
    />
  )
}

export function Avatar({ src, alt, ...look }: AvatarProps) {
  const { className, style } = avatarLook(look)
  return (
    <span data-slot="avatar" className={className} style={style}>
      <AvatarImage src={src} alt={alt} />
    </span>
  )
}
