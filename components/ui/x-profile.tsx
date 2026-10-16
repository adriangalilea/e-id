import { CalendarDays, Link2, MapPin } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { CardLink } from "@/components/ui/card-link"
import { Image } from "@/components/ui/image"
import { Panel } from "@/components/ui/panel"
import { ANCHOR, LINK, MUTED, Verified, XText } from "@/components/ui/tweet"
import { cn } from "@/lib/utils"
import type { XProfile as XProfileFacts } from "@/lib/x-profile-data"

export interface XProfileProps {
  profile: XProfileFacts
  /** Seen by its owner: "Edit profile" where anyone else sees "Follow". */
  own?: boolean
  className?: string
}

const JOINED = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})
const COUNT = new Intl.NumberFormat("en", { notation: "compact" })

/** The face is a share of the header's width, as X sizes it, and stands half over
 *  the banner: its top margin is minus half its own width, both shares of the same
 *  width (a margin's percentage is the container's width). */
const FACE = 0.22

export function XProfile({ profile, own, className }: XProfileProps) {
  const { author } = profile
  return (
    <Panel
      render={<CardLink href={profile.url} />}
      data-slot="x-profile"
      bodyClassName="gap-0 p-0"
      className={cn("clip-rounded font-sans text-[15px]", className)}
    >
      <div
        data-slot="x-profile-banner"
        className="relative aspect-[3/1] bg-foreground/10"
      >
        {profile.banner && (
          <Image src={profile.banner} alt="" fill sizes="36rem" />
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Image
            src={author.avatar}
            alt={author.name}
            data-slot="x-profile-avatar"
            className={cn(
              "aspect-square w-(--ag-x-face) -mt-(--ag-x-lift) object-cover ring-4 ring-card",
              author.square ? "rounded-[12%]" : "rounded-full",
            )}
            style={
              {
                "--ag-x-face": `${FACE * 100}%`,
                "--ag-x-lift": `${(FACE / 2) * 100}%`,
              } as React.CSSProperties
            }
          />
          <Button
            render={<a href={profile.url} {...ANCHOR} />}
            variant={own ? "outline" : "default"}
            className="mt-3 rounded-full font-bold"
          >
            {own ? "Edit profile" : "Follow"}
          </Button>
        </div>
        <div className="flex flex-col">
          <span className="flex items-center gap-1 font-extrabold text-[20px] leading-6">
            <span className="truncate">{author.name}</span>
            {author.verified && <Verified kind={author.verified} />}
          </span>
          <span className={MUTED}>{author.handle}</span>
        </div>
        {profile.bio.length > 0 && <XText runs={profile.bio} />}
        <div
          data-slot="x-profile-facts"
          className={cn("flex flex-wrap gap-x-3 gap-y-1", MUTED)}
        >
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-[1.15em]" aria-hidden="true" />
              {profile.location}
            </span>
          )}
          {profile.website && (
            <span className="flex min-w-0 items-center gap-1">
              <Link2 className="size-[1.15em] shrink-0" aria-hidden="true" />
              <a
                href={profile.website.href}
                {...ANCHOR}
                className={cn("truncate", LINK)}
              >
                {profile.website.text}
              </a>
            </span>
          )}
          {profile.joined && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-[1.15em]" aria-hidden="true" />
              Joined {JOINED.format(new Date(profile.joined))}
            </span>
          )}
        </div>
        {profile.counts && (
          <div data-slot="x-profile-counts" className="flex gap-5">
            <span>
              <span className="font-bold">
                {COUNT.format(profile.counts.following)}
              </span>{" "}
              <span className={MUTED}>Following</span>
            </span>
            <span>
              <span className="font-bold">
                {COUNT.format(profile.counts.followers)}
              </span>{" "}
              <span className={MUTED}>Followers</span>
            </span>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** One field of X's Edit profile: its label over its value, in X's outlined box. */
export function XProfileField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      data-slot="x-profile-field"
      className={cn(
        "flex min-w-0 flex-col rounded-[4px] border border-foreground/20 px-2 pt-1.5 pb-2 font-sans",
        className,
      )}
    >
      <span className={cn("text-[13px]", MUTED)}>{label}</span>
      <span className="truncate text-[17px]">{value}</span>
    </div>
  )
}
