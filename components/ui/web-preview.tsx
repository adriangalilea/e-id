"use client"

// A LINK'S UNFURL, as a card, from five facts and nothing else: `web-preview-unfurl`
// owns the facts and the one fetch; this is a pure function of them, so the same link
// draws identically in a chat bubble, in an article and in a feed.
//
// THREE STYLES, one component, chosen by the page it sits on:
//   card      ours, the default. The image at 16:9, the title at reading size, the
//             description in two lines, the domain as mono metadata with the site's
//             icon; the whole card is the link. Its surface is a `Panel`'s, plain or
//             glass (`material`, else the nearest MaterialProvider), the picture
//             running to its edge; inside a frame already drawn it draws no box
//             (`frame` decides when given). Under the pointer plain lifts a touch,
//             glass catches more light on its rim.
//   telegram  the client's card inside a bubble: a rule on the left, the site name in
//             link-blue, bold title, muted text, image on top. Sized in em so it
//             follows the bubble's type; coloured by the bubble through `--wp-*` (ink,
//             text, muted, wash), with the page's colours when nothing sets them.
//   x         the large-image card: the picture with the domain in a chip over its
//             foot; with no image, a bordered card of title, description and domain.
//
// Style is utilities in the JSX, merged with `cn`; the only custom properties are the
// telegram colours the chat hands in, consumed by `-[var(--wp-…)]` utilities. The
// telegram and x styles are a platform's own look (a bubble's card, X's card), drawn
// as that platform draws them, in no material of ours.

import { Image } from "@/components/ui/image"
import {
  type Material,
  type Scheme,
  useMaterial,
} from "@/components/ui/material"
import { Panel, useInFrame } from "@/components/ui/panel"
import { cn } from "@/lib/utils"
import { hostOf, type Unfurl } from "@/lib/web-preview-unfurl"

export type WebPreviewStyle = "card" | "telegram" | "x"

export interface WebPreviewProps {
  facts: Unfurl
  style?: WebPreviewStyle
  /** The card style's surface (a panel). Default drawn, except inside a frame
   *  already drawn. */
  frame?: boolean
  /** The card style's material: default the nearest provider's. */
  material?: Material
  /** The colour scheme the card style's panel stands in (material). */
  scheme?: Scheme
  className?: string
}

const ANCHOR =
  "block no-underline text-inherit transition-[background-color,transform,box-shadow] duration-300 ease-out"

/** The card under the pointer: plain lifts a touch, glass catches more light. */
const LIFT: Record<Material, string> = {
  plain:
    "transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]",
  glass: "hover:[--glass-rim:1.5]!",
}

export function WebPreview({
  facts,
  style = "card",
  frame,
  material,
  scheme,
  className,
}: WebPreviewProps) {
  const m = useMaterial(material)
  const inFrame = useInFrame()
  const framed = frame ?? !inFrame
  const host = hostOf(facts.url)
  const shared = {
    href: facts.url,
    target: "_blank",
    rel: "noopener noreferrer",
    "data-slot": "web-preview",
    "data-style": style,
  } as const

  if (style === "telegram")
    return (
      <a
        {...shared}
        className={cn(
          ANCHOR,
          "mt-[0.45em] overflow-hidden rounded-[0.35em] border-[var(--wp-ink,currentColor)] border-l-[3px] bg-[var(--wp-wash,color-mix(in_srgb,currentColor_10%,transparent))] px-[0.65em] py-[0.45em] text-[var(--wp-text,inherit)] hover:bg-[var(--wp-wash-hover,color-mix(in_srgb,currentColor_18%,transparent))]",
          className,
        )}
      >
        {facts.image && (
          <Image
            className="mb-[0.45em] block aspect-video w-full rounded-[0.3em] object-cover"
            src={facts.image}
            alt=""
          />
        )}
        <div className="font-semibold text-[0.9em] text-[var(--wp-ink,currentColor)]">
          {facts.site}
        </div>
        <div className="mt-[0.1em] font-semibold leading-tight">
          {facts.title}
        </div>
        {facts.description && (
          <div className="mt-[0.15em] line-clamp-3 text-[0.9em] text-[var(--wp-muted,inherit)] leading-tight opacity-90">
            {facts.description}
          </div>
        )}
      </a>
    )

  if (style === "x")
    return (
      <a
        {...shared}
        className={cn(
          ANCHOR,
          "relative overflow-hidden rounded-2xl border border-border bg-background hover:bg-muted/40",
          className,
        )}
      >
        {facts.image ? (
          <>
            <Image
              className="block aspect-video w-full object-cover"
              src={facts.image}
              alt=""
            />
            <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-black/70 px-2 py-0.5 text-white text-xs">
              {facts.title}
            </span>
          </>
        ) : (
          <div className="space-y-0.5 p-3">
            <div className="text-muted-foreground text-sm">{host}</div>
            <div className="font-medium leading-snug">{facts.title}</div>
            {facts.description && (
              <p className="line-clamp-2 text-muted-foreground text-sm">
                {facts.description}
              </p>
            )}
          </div>
        )}
      </a>
    )

  return (
    <Panel
      render={<a href={facts.url} target="_blank" rel="noopener noreferrer" />}
      data-slot="web-preview"
      data-style={style}
      material={m}
      scheme={scheme}
      frame={framed}
      // The picture runs to the edge, crisp: glass round media is an edge.
      spill={false}
      bodyClassName="gap-0 p-0"
      className={cn("no-underline", framed && LIFT[m], className)}
    >
      {facts.image && (
        <Image
          className={cn(
            "block aspect-video w-full object-cover",
            framed ? "rounded-t-(--panel-radius)" : "rounded-lg",
          )}
          src={facts.image}
          alt=""
        />
      )}
      <div className={cn("space-y-1.5", framed ? "p-4" : "pt-3")}>
        <div className="flex items-center gap-1.5 font-mono text-current/55 text-xs lowercase">
          {facts.favicon && (
            <Image className="size-3.5 rounded-sm" src={facts.favicon} alt="" />
          )}
          {host}
        </div>
        <div className="font-semibold leading-snug">{facts.title}</div>
        {facts.description && (
          <p className="line-clamp-2 text-current/60 text-sm leading-snug">
            {facts.description}
          </p>
        )}
      </div>
    </Panel>
  )
}
