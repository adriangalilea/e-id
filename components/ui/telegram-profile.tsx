import { BadgeCheck, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  TelegramProfile as Facts,
  TelegramKind,
} from "@/lib/telegram-profile-data"
import { CardLink } from "@/components/ui/card-link"
import { Image } from "@/components/ui/image"

const BLUE = "#2aabee"
const COUNT = new Intl.NumberFormat("en", { notation: "compact" })

/** What the card says it is, beside the handle. */
function whatItIs(kind: TelegramKind, followers?: number): string | undefined {
  const n = followers === undefined ? undefined : COUNT.format(followers)
  if (kind === "channel") return n ? `channel · ${n} subscribers` : "channel"
  if (kind === "group") return n ? `group · ${n} members` : "group"
  if (kind === "bot") return "bot"
  return undefined
}

/** A face where the profile has no photo: its initials on Telegram's blue. */
function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? "")
    .join("")
    .toUpperCase()
  return (
    <span
      aria-hidden
      className="grid size-full place-items-center font-medium text-white text-xl"
      style={{ background: BLUE }}
    >
      {letters}
    </span>
  )
}

export function TelegramProfile({
  profile,
  className,
}: {
  profile: Facts
  className?: string
}) {
  const what = whatItIs(profile.kind, profile.followers)
  const open = profile.kind === "user" ? "send a message" : "open in Telegram"
  return (
    <CardLink
      href={profile.url}
      data-slot="telegram-profile"
      className={cn(
        "group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 font-sans text-[15px] text-card-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <span
          data-slot="telegram-profile-photo"
          className="size-16 shrink-0 overflow-hidden rounded-full bg-foreground/8"
        >
          {profile.photo ? (
            <Image
              src={profile.photo}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Initials name={profile.name} />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-[18px] leading-tight">
              {profile.name}
            </span>
            {profile.verified && (
              <BadgeCheck
                aria-label="verified"
                className="size-4.5 shrink-0"
                style={{ color: BLUE }}
              />
            )}
          </div>
          <div className="mt-0.5 truncate text-[14px] text-foreground/55">
            @{profile.handle}
            {what && <span> · {what}</span>}
          </div>
        </div>
      </div>
      {profile.bio && (
        <p
          data-slot="telegram-profile-bio"
          className="whitespace-pre-line text-foreground/80 leading-relaxed"
        >
          {profile.bio}
        </p>
      )}
      <a
        href={profile.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md px-4 font-medium text-[14px] text-white transition-[filter] hover:brightness-110"
        style={{ background: BLUE }}
      >
        <Send aria-hidden className="size-4" />
        {open}
      </a>
    </CardLink>
  )
}
