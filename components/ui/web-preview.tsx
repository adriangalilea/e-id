import { cn } from "@/lib/utils"
import {
  hostOf,
  type Unfurl,
} from "@/lib/web-preview-unfurl"
import { Image } from "@/components/ui/image"

export type WebPreviewStyle = "card" | "telegram" | "x"

export interface WebPreviewProps {
  facts: Unfurl
  style?: WebPreviewStyle
  className?: string
}

const ANCHOR =
  "block no-underline text-inherit transition-[background-color,transform,box-shadow] duration-300 ease-out"

export function WebPreview({
  facts,
  style = "card",
  className,
}: WebPreviewProps) {
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
          "mt-[0.45em] overflow-hidden rounded-[0.35em] border-l-[3px] border-[var(--wp-ink,currentColor)] bg-[var(--wp-wash,color-mix(in_srgb,currentColor_10%,transparent))] px-[0.65em] py-[0.45em] text-[var(--wp-text,inherit)] hover:bg-[var(--wp-wash-hover,color-mix(in_srgb,currentColor_18%,transparent))]",
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
          <div className="mt-[0.15em] line-clamp-3 text-[0.9em] leading-tight text-[var(--wp-muted,inherit)] opacity-90">
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
    <a
      {...shared}
      className={cn(
        ANCHOR,
        "group overflow-hidden rounded-xl border border-border bg-card text-card-foreground hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      {facts.image && (
        <Image
          className="block aspect-video w-full object-cover"
          src={facts.image}
          alt=""
        />
      )}
      <div className="space-y-1.5 p-4">
        <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs lowercase">
          {facts.favicon && (
            <Image className="size-3.5 rounded-sm" src={facts.favicon} alt="" />
          )}
          {host}
        </div>
        <div className="font-semibold leading-snug">{facts.title}</div>
        {facts.description && (
          <p className="line-clamp-2 text-foreground/60 text-sm leading-snug">
            {facts.description}
          </p>
        )}
      </div>
    </a>
  )
}
