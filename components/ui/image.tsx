"use client"

import NextImage, { type ImageProps as NextImageProps } from "next/image"
import type * as React from "react"
import { type CSSProperties, type Ref, useState } from "react"
import { cn } from "@/lib/utils"
import type { Arrival } from "./img"

export type ImageProps = Omit<NextImageProps, "placeholder"> & {
  /** Classes on the pixels, e.g. object-contain or object-top. className styles the frame. */
  imageClassName?: string
  ref?: Ref<HTMLImageElement>
}

/** What a static import carries with it: dimensions and a blur, for free. `null` for a
 *  URL string, which carries nothing. */
const staticOf = (src: ImageProps["src"]) =>
  typeof src === "object" ? ("default" in src ? src.default : src) : null

/** Next.js optimization on any Next host. Supply dimensions (or a sized parent
 * with fill); remote/public assets can supply a prepared blurDataURL. Static
 * imports provide dimensions and a blur automatically. No fetch for a placeholder. */
export function Image({ src, ...props }: ImageProps) {
  // A new source owns a new load lifecycle, including when the old request finishes late.
  return (
    <ImageResource
      key={staticOf(src)?.src ?? String(src)}
      src={src}
      {...props}
    />
  )
}

/** A plain `<img>` that arrives the way Image does lives in `img.tsx`, free of
 *  next/image; it is this item's too. */
export { Img, type ImgProps } from "./img"

/** Image's arrival, the same states as Img's (`Arrival`, img.tsx), read from the
 *  element as it mounts and then from its events. */
function useArrival(ref: Ref<HTMLImageElement> | undefined) {
  const [state, setState] = useState<Arrival>()
  const attach = (el: HTMLImageElement | null) => {
    if (el)
      setState(
        !el.complete ? "loading" : el.naturalWidth > 0 ? "ready" : "error",
      )
    if (typeof ref === "function") ref(el)
    else if (ref) ref.current = el
  }
  return [state, setState, attach] as const
}

function ImageResource({
  src,
  width,
  height,
  fill,
  blurDataURL,
  className,
  imageClassName,
  style,
  onLoad,
  onError,
  ref,
  ...props
}: ImageProps) {
  const [state, setState, attach] = useArrival(ref)
  const data = staticOf(src)
  const w = width ?? data?.width
  const h = height ?? data?.height
  const blur = blurDataURL ?? data?.blurDataURL
  return (
    <span
      data-slot="image"
      data-state={state}
      className={cn(
        "not-prose group/image relative block overflow-hidden bg-foreground/4",
        fill
          ? "absolute inset-0"
          : "w-(--image-width) max-w-full aspect-(--image-aspect)",
        className,
      )}
      style={
        {
          "--image-width": `${w}px`,
          "--image-aspect": `${w} / ${h}`,
          ...style,
        } as CSSProperties
      }
    >
      {blur && (
        <span
          aria-hidden="true"
          data-slot="image-placeholder"
          className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none group-data-[state=ready]/image:opacity-0 group-data-[state=error]/image:opacity-0"
        >
          {/* Same fit and position as the final pixels, including transparent/contained media. */}
          {/* biome-ignore lint/performance/noImgElement: inline preview, no network or optimizer */}
          <img
            src={blur}
            alt=""
            className={cn("size-full object-cover", imageClassName)}
            style={{ filter: "blur(12px)" }}
          />
        </span>
      )}
      <NextImage
        {...props}
        src={src}
        width={width}
        height={height}
        fill={fill}
        ref={attach}
        data-slot="image-content"
        // Next's onLoad runs after decode(), including images cached before hydration.
        onLoad={(event) => {
          setState("ready")
          onLoad?.(event)
        }}
        onError={(event) => {
          setState("error")
          onError?.(event)
        }}
        className={cn(
          "relative block size-full object-cover transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none",
          "group-data-[state=loading]/image:opacity-0 motion-safe:group-data-[state=loading]/image:blur-sm",
          imageClassName,
        )}
      />
    </span>
  )
}
