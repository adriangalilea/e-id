"use client"
import { type RefObject, useRef } from "react"
import { cn } from "@/lib/utils"
import { Image } from "./image"
import { useMediaIntent } from "./image-intent"

export type AnimatedImageProps = {
  src: string
  poster: string
  width: number
  height: number
  alt: string
  blurDataURL?: string
  className?: string
  imageClassName?: string
  sizes?: string
  playOn?: "intent" | "visible"
  /** Show an optional play/pause button. Covers are unadorned by default. */
  controls?: boolean
  interactionRef?: RefObject<HTMLElement | null>
}

/** Native animated image, loaded only while requested. Stopping returns to its poster.
 * This does not promise frame-accurate pause/seek; use Video for those controls. */
export function AnimatedImage(props: AnimatedImageProps) {
  return <AnimationSource key={props.src} {...props} />
}
function AnimationSource({
  src,
  poster,
  width,
  height,
  alt,
  blurDataURL,
  className,
  imageClassName,
  sizes = "100vw",
  playOn,
  controls = false,
  interactionRef,
}: AnimatedImageProps) {
  const frame = useRef<HTMLDivElement>(null)
  const intent = useMediaIntent(frame, interactionRef)
  const active = intent.active(playOn)
  return (
    <div
      ref={frame}
      tabIndex={interactionRef || controls ? undefined : 0}
      data-slot="image-animation"
      data-playing={active}
      className={cn("not-prose relative max-w-full overflow-hidden", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        blurDataURL={blurDataURL}
        imageClassName={imageClassName}
      />
      {active && (
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          unoptimized
          imageClassName={imageClassName}
        />
      )}
      {controls && (
        <button
          type="button"
          aria-label={`${active ? "Pause" : "Play"} ${alt}`}
          aria-pressed={active}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            intent.setManual(!active)
          }}
          className="absolute right-2 bottom-2 rounded-full bg-black/60 px-3 py-2 text-xs text-white"
        >
          {active ? "pause" : "play"}
        </button>
      )}
    </div>
  )
}
