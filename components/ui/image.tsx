"use client"

// A PICTURE THAT ARRIVES: one `<img>`, held until it has really loaded, then faded
// in, with its box reserved from the first paint. No framework: whoever serves the
// pixels at a width is a loader (`ImageLoader`), set once for a site
// (`ImageLoaderProvider`; a Next host wraps its layout in `NextImageLoaderProvider`)
// or on one picture.
// Without one the source loads as it is. Every `<img>` in this registry is this.

import type * as React from "react"
import { createContext, type Ref, use, useState } from "react"
import { preload } from "react-dom"
import { cn } from "@/lib/utils"

/** A source at a width: the URL that serves it, or `null` where nothing can resize
 *  it (an SVG, a data URL, another origin) and the source loads as it is. */
export type ImageLoader = (request: {
  src: string
  width: number
  quality: number
}) => string | null

/** The widths a loader is asked for: Next's (`imageSizes` then `deviceSizes`, its
 *  defaults), which its optimizer accepts and no other. A loader of your own takes
 *  them too, so a CDN's cache holds sixteen renditions of a picture at most. */
const SMALL = [16, 32, 48, 64, 96, 128, 256, 384]
const DEVICE = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
const WIDTHS = [...SMALL, ...DEVICE]

/** Next's optimizer, on the host's own files (`/public`, a static import). A remote
 *  picture needs `images.remotePatterns` in next.config; write a loader that says
 *  which hosts you allowed. */
export const nextImageLoader: ImageLoader = ({ src, width, quality }) =>
  !src.startsWith("/") || src.startsWith("//") || /\.svg($|\?)/.test(src)
    ? null
    : `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`

const LoaderContext = createContext<ImageLoader | null>(null)

/** The site's loader, for every picture under it that names none. */
export function ImageLoaderProvider({
  loader,
  children,
}: {
  loader: ImageLoader
  children: React.ReactNode
}) {
  return <LoaderContext value={loader}>{children}</LoaderContext>
}

/** Next's optimizer for every picture under it, from a server layout as well (a
 *  function cannot cross into the client as a prop; a loader of your own is set
 *  from a client file of yours). */
export function NextImageLoaderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <LoaderContext value={nextImageLoader}>{children}</LoaderContext>
}

/** What a static import carries (Next's `StaticImageData`, any bundler's alike):
 *  its size and a blur, for free. */
export type StaticImage = {
  src: string
  width: number
  height: number
  blurDataURL?: string
}

/** Where a picture stands in its arrival. None until the page is live: only React
 *  can mark a picture ready, so one held from the server's HTML would wait for
 *  hydration however early it landed (a cached poster, there in 0.4 s, stayed blank
 *  for seconds on a heavy page). The first paint holds nothing and the browser
 *  paints each picture as it lands; once live, one still on its way is held and
 *  fades in, one already there is ready. Read from the element, since a load that
 *  finished before hydration fired before React was listening. */
export type Arrival = "loading" | "ready" | "error" | undefined

/** How a picture arrives: held clear and a little blurred until it is decoded, then
 *  it fades and sharpens in, never under reduced motion's blur. A picture that never
 *  arrives stays clear: the browser's broken glyph and its alt text are not a
 *  picture, and what stands behind (the host's tone, its stand-in) is the honest
 *  face; the alt stays for a screen reader. */
const ARRIVAL =
  "transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none data-[state=loading]:opacity-0 motion-safe:data-[state=loading]:blur-sm"

export type ImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> & {
  src: string | StaticImage
  /** Its size in pixels: the box is reserved from these before a byte arrives, and
   *  without `sizes` the loader is asked for this width and twice it. A static
   *  import says them itself. */
  width?: number
  height?: number
  /** Fill the positioned parent instead, its box the parent's. */
  fill?: boolean
  /** How wide it is drawn, as the `sizes` attribute says it ("(max-width: 640px)
   *  100vw, 33vw"): the browser picks the rendition from it. */
  sizes?: string
  /** How the pixels (and the blur under them) meet a box of another shape. */
  fit?: "cover" | "contain"
  /** The picture the page is about, above the fold: asked for first, preloaded,
   *  never lazy, never faded. */
  priority?: boolean
  quality?: number
  /** Overrides the site's loader for this picture; `unoptimized` loads it as it is. */
  loader?: ImageLoader
  unoptimized?: boolean
  /** A tiny picture of it (prepare-media's, a static import's), drawn blurred under
   *  it until it lands. With one the picture paints over its blur, no fade. */
  blurDataURL?: string
  /** Where else the picture is, tried in order when one fails or comes back too
   *  small (`minWidth`): a host's sizes, largest first (YouTube's maxres, then hq).
   *  None arriving is the error face. */
  fallbacks?: string[]
  /** The narrowest a picture may be, in its natural pixels, to count as arrived. A
   *  host that answers a missing size with a stand-in (YouTube's 120 px grey for a
   *  maxres it never made) is told apart by this, and the next source is tried. */
  minWidth?: number
  ref?: Ref<HTMLImageElement>
}

/** The picture. A new source is a new arrival. */
export function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : props.src.src
  return <ImageSources key={src} {...props} />
}

/** The renditions of a source the browser may choose from. With `sizes` (a fill
 *  without them is drawn 100vw), every width at least as wide as the narrowest the
 *  page can draw it (its smallest vw share of the narrowest phone, Next's rule);
 *  with a width alone, it and twice it, for the screen's density. Told neither, the
 *  source loads as it is: no width can be chosen from nothing. What Image draws,
 *  for whoever needs the same candidates elsewhere (a lightbox's full view). */
export function imageRenditions(
  src: string,
  loader: ImageLoader,
  {
    quality = 75,
    width,
    sizes,
    fill,
  }: { quality?: number; width?: number; sizes?: string; fill?: boolean },
): { src: string; srcSet: string } | null {
  const at = (w: number) => loader({ src, width: w, quality })
  if (!sizes && !fill && !width) return null
  if (sizes || fill || !width) {
    const shares = [...(sizes ?? "100vw").matchAll(/(?:^|\s)(\d{1,3})vw/g)].map(
      (m) => Number(m[1]) / 100,
    )
    const floor = shares.length
      ? (DEVICE[0] as number) * Math.min(...shares)
      : 0
    const urls = WIDTHS.filter((w) => w >= floor).map(
      (w) => [at(w), w] as const,
    )
    if (urls.some(([url]) => url === null)) return null
    return {
      src: urls.at(-1)?.[0] as string,
      srcSet: urls.map(([url, w]) => `${url} ${w}w`).join(", "),
    }
  }
  const fit = (w: number) =>
    WIDTHS.find((s) => s >= w) ?? (WIDTHS.at(-1) as number)
  const one = at(fit(width))
  const two = at(fit(width * 2))
  if (one === null || two === null) return null
  return { src: two, srcSet: `${one} 1x, ${two} 2x` }
}

/** The blur drawn under the picture, as an SVG of the tiny one (Next's): blurred and
 *  its edges kept opaque, so it fills the box instead of fading at the rim. */
function blurBackground(
  blur: string,
  fit: "cover" | "contain",
  w: number | undefined,
  h: number | undefined,
): React.CSSProperties {
  const box = w && h ? `viewBox='0 0 ${w} ${h}'` : ""
  const aspect = box
    ? "none"
    : fit === "contain"
      ? "xMidYMid"
      : "xMidYMid slice"
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' ${box}><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='20'/><feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/><feFlood x='0' y='0' width='100%' height='100%'/><feComposite operator='out' in='s'/><feComposite in2='SourceGraphic'/><feGaussianBlur stdDeviation='20'/></filter><image width='100%' height='100%' x='0' y='0' preserveAspectRatio='${aspect}' style='filter: url(#b);' href='${blur}'/></svg>`
  return {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`,
    backgroundSize: fit,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }
}

/** What a loaded picture is: arrived, or not this source after all (a stand-in too
 *  narrow, or nothing), judged the same whether it landed before React was
 *  listening (read in the ref) or after (the load event). */
function judge(el: HTMLImageElement, minWidth: number): "arrived" | "missing" {
  return el.naturalWidth > 0 && el.naturalWidth >= minWidth
    ? "arrived"
    : "missing"
}

function ImageSources({
  src: given,
  width,
  height,
  fill,
  sizes,
  fit = "cover",
  priority,
  quality,
  loader,
  unoptimized,
  blurDataURL,
  fallbacks = [],
  minWidth = 0,
  loading,
  className,
  style,
  onLoad,
  onError,
  ref,
  ...props
}: ImageProps) {
  const site = use(LoaderContext)
  const data = typeof given === "string" ? null : given
  const w = width ?? data?.width
  const h = height ?? data?.height
  const blur = blurDataURL ?? data?.blurDataURL
  const sources = [data?.src ?? (given as string), ...fallbacks]
  const [at, setAt] = useState(0)
  const [state, setState] = useState<Arrival>()
  const source = sources[at] as string
  const load = unoptimized ? null : (loader ?? site)
  const sized =
    load && imageRenditions(source, load, { quality, width: w, sizes, fill })
  const shown = sized ? sized.src : source
  const srcSet = sized ? sized.srcSet : undefined
  const sizesAttr = srcSet?.endsWith("w") ? (sizes ?? "100vw") : undefined
  if (priority)
    preload(shown, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: srcSet,
      imageSizes: sizesAttr,
    })
  const last = at === sources.length - 1
  // Settles the source shown: arrived, or on to the next, or the error face.
  const settle = (verdict: "arrived" | "missing") => {
    if (verdict === "arrived") return setState("ready")
    if (last) return setState("error")
    setAt(at + 1)
    setState("loading")
  }
  const attach = (el: HTMLImageElement | null) => {
    if (el) {
      if (!el.complete) setState("loading")
      else settle(judge(el, minWidth))
    }
    if (typeof ref === "function") ref(el)
    else if (ref) ref.current = el
  }
  const placeholder =
    blur && state !== "ready" ? blurBackground(blur, fit, w, h) : undefined
  // The box's shape from its size, said outright, and never the pixels': the
  // attributes alone give the browser `auto w / h`, and WebKit sizes a broken
  // picture by its broken face whatever the ratio says (a square), unless size
  // containment rules its contents out. A caller's own aspect class wins.
  const shape = !fill && w && h
  return (
    // biome-ignore lint/performance/noImgElement: the one picture element, the loader resizes
    // biome-ignore lint/a11y/useAltText: alt passes through with the rest of the props
    <img
      data-slot="image"
      {...props}
      src={shown}
      srcSet={srcSet}
      sizes={sizesAttr}
      width={fill ? undefined : w}
      height={fill ? undefined : h}
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : props.fetchPriority}
      decoding={props.decoding ?? "async"}
      ref={attach}
      data-state={state}
      onLoad={(event) => {
        settle(judge(event.currentTarget, minWidth))
        onLoad?.(event)
      }}
      onError={(event) => {
        settle("missing")
        onError?.(event)
      }}
      className={cn(
        fill ? "absolute inset-0 size-full" : "h-auto max-w-full",
        shape && "aspect-(--image-aspect) contain-size",
        fit === "contain" ? "object-contain" : "object-cover",
        !blur && !priority && ARRIVAL,
        "data-[state=error]:opacity-0",
        className,
      )}
      style={
        {
          ...(shape ? { "--image-aspect": `${w} / ${h}` } : {}),
          ...placeholder,
          ...style,
        } as React.CSSProperties
      }
    />
  )
}
