"use client"

// A PROFILE ON A PLATFORM, drawn from its facts (`lib/social-profile-core`): a person, a
// bot, a channel, a group or an organization on Telegram, GitHub or YouTube, or any
// profile a consumer maps to the same facts. One component, two forms:
//
//   card     the photo, the name with its check, the handle with what it is and what
//            it counts, the bio, and the way in: a button into the platform.
//   compact  one row, for a hover card or a list: the face, the name, the handle and
//            the one count that matters, the platform's mark at its end.
//
// Its surface is a `Panel`'s, in either material: plain, the page's card; glass, the
// panel's glass, read from the nearest MaterialProvider like any control. Inside a
// frame already drawn (a panel, a hover card) it draws no box of its own and stands in
// that one, in its scheme; `frame` decides when given.
//
// The whole of it opens the profile (`card-link`); a real link inside is the
// keyboard's way there (the card's button, the compact row's name). The button is the
// registry's, its default face in the platform's colour where it has one (the theme's
// primary, set on it), plain in both materials: it stands on the card, and glass on
// the card's glass is what the registry does not draw by default. No request at
// render: the facts were read before (a build, a cache).

import { BadgeCheck } from "lucide-react"
import type * as React from "react"
import { type SimpleIcon, siGithub, siTelegram, siYoutube } from "simple-icons"
import { cn } from "@/lib/utils"
import {
  countText,
  type ProfileFacts,
  platformOf,
  type SocialPlatform,
} from "@/lib/social-profile-core"
import {
  Avatar,
  type AvatarSize,
  avatarLook,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CardLink } from "@/components/ui/card-link"
import {
  type Material,
  type Scheme,
  useMaterial,
} from "@/components/ui/material"
import { Panel, useInFrame } from "@/components/ui/panel"

export type SocialProfileForm = "card" | "compact"

const MARKS: Record<SocialPlatform, SimpleIcon> = {
  telegram: siTelegram,
  github: siGithub,
  youtube: siYoutube,
}

/** A platform's mark, in the words' colour: what a row of a person's places draws,
 *  and what the profile says it is on. Unnamed: what holds it says the platform (a
 *  button's label, the words beside it). Nothing for a platform this family does not
 *  know. */
export function SocialMark({
  platform,
  className,
}: {
  platform: string
  className?: string
}) {
  if (!platformOf(platform)) return null
  const icon = MARKS[platform as SocialPlatform]
  return (
    <svg
      data-slot="social-mark"
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4 shrink-0", className)}
    >
      <path d={icon.path} />
    </svg>
  )
}

/** The profile under the hand: plain, a step of the words' colour into the card;
 *  glass, its rim catching more light (important, over the glass's own light). */
const LIFT: Record<Material, string> = {
  plain:
    "transition-colors hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]",
  glass: "hover:[--glass-rim:1.5]!",
}

/** The face: the photo on the avatar's rungs, an organization's a rounded square as
 *  its platform draws it; with no photo, the name's initials. */
function Face({ facts, size }: { facts: ProfileFacts; size: AvatarSize }) {
  const square = facts.kind === "organization" && "rounded-[22%]"
  if (facts.photo)
    return (
      <Avatar
        src={facts.photo}
        alt=""
        size={size}
        className={square || undefined}
      />
    )
  const letters = facts.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? "")
    .join("")
    .toUpperCase()
  const look = avatarLook({ size })
  const tone = platformOf(facts.platform)?.tone
  return (
    <span
      aria-hidden
      data-slot="avatar"
      className={cn(
        look.className,
        square,
        "grid place-items-center font-medium",
        size === "lg" ? "text-xl" : "text-sm",
        tone
          ? "bg-(--ag-profile-tone) text-white"
          : "bg-current/12 text-current",
      )}
      style={
        tone
          ? ({
              ...look.style,
              "--ag-profile-tone": tone,
            } as React.CSSProperties)
          : look.style
      }
    >
      {letters}
    </span>
  )
}

/** The name, and its check when the platform verified it. */
function Name({
  facts,
  href,
  className,
}: {
  facts: ProfileFacts
  href?: string
  className: string
}) {
  const check = platformOf(facts.platform)?.check
  const name = <span className="truncate">{facts.name}</span>
  return (
    <span
      data-slot="social-profile-name"
      className={cn("flex min-w-0 items-center gap-1.5", className)}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate no-underline hover:underline"
        >
          {facts.name}
        </a>
      ) : (
        name
      )}
      {facts.verified && (
        <BadgeCheck
          aria-label="verified"
          className={cn(
            "size-[1em] shrink-0",
            check ? "text-(--ag-profile-check)" : "text-current/55",
          )}
          style={
            check
              ? ({ "--ag-profile-check": check } as React.CSSProperties)
              : undefined
          }
        />
      )}
    </span>
  )
}

export interface SocialProfileProps {
  facts: ProfileFacts
  /** `card` (default), or one `compact` row. */
  form?: SocialProfileForm
  /** The platform's mark, for a platform this family does not know (a page of the
   *  consumer's own); a known one draws its own. */
  mark?: React.ReactNode
  /** Its own surface (a panel). Default drawn, except inside a frame already
   *  drawn. */
  frame?: boolean
  material?: Material
  /** The colour scheme its panel stands in (material): default the nearest
   *  provider's. */
  scheme?: Scheme
  className?: string
}

export function SocialProfile({
  facts,
  form = "card",
  mark,
  frame,
  material,
  scheme,
  className,
}: SocialProfileProps) {
  const m = useMaterial(material)
  const inFrame = useInFrame()
  const framed = frame ?? !inFrame
  const platform = platformOf(facts.platform)
  const theMark = mark ?? <SocialMark platform={facts.platform} />
  const panel = {
    render: <CardLink href={facts.url} />,
    "data-slot": "social-profile",
    "data-form": form,
    "data-platform": facts.platform,
    material: m,
    scheme,
    frame: framed,
  }

  if (form === "compact") {
    const lead = facts.counts[0]
    return (
      <Panel
        {...panel}
        bodyClassName={cn(
          "flex-row items-center gap-3",
          framed ? "px-3 py-2.5" : "p-0",
        )}
        className={cn("group font-sans text-sm", framed && LIFT[m], className)}
      >
        <Face facts={facts} size="md" />
        <div className="min-w-0 flex-1">
          <Name
            facts={facts}
            href={facts.url}
            className="font-semibold leading-tight"
          />
          <div className="truncate text-[13px] text-current/55">
            @{facts.handle}
            {lead && <span> · {countText(lead)}</span>}
          </div>
        </div>
        <span data-slot="social-profile-mark" className="opacity-60">
          {theMark}
        </span>
      </Panel>
    )
  }

  const what = [
    platform && facts.kind !== platform.usual ? facts.kind : undefined,
    ...facts.counts.map(countText),
  ].filter(Boolean)
  return (
    <Panel
      {...panel}
      bodyClassName={framed ? "gap-4 p-4" : "gap-4 p-0"}
      className={cn(
        "group font-sans text-[15px]",
        framed && LIFT[m],
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Face facts={facts} size="lg" />
        <div className="min-w-0">
          <Name
            facts={facts}
            className="font-semibold text-[18px] leading-tight"
          />
          <div className="mt-0.5 truncate text-[14px] text-current/55">
            @{facts.handle}
            {what.map((w) => (
              <span key={w}> · {w}</span>
            ))}
          </div>
        </div>
      </div>
      {facts.bio && (
        <p
          data-slot="social-profile-bio"
          className="line-clamp-4 whitespace-pre-line text-current/80 leading-relaxed"
        >
          {facts.bio}
        </p>
      )}
      <Button
        render={
          <a href={facts.url} target="_blank" rel="noopener noreferrer" />
        }
        material="plain"
        corners={m === "glass" ? "pill" : "soft"}
        size="lg"
        icon={theMark}
        style={
          platform?.tone
            ? ({
                "--primary": platform.tone,
                "--primary-foreground": "#fff",
              } as React.CSSProperties)
            : undefined
        }
        className="self-start"
      >
        {platform ? platform.open(facts.kind) : "open"}
      </Button>
    </Panel>
  )
}
