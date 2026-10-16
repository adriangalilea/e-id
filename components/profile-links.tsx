import { ArrowUpRight, Clock } from "lucide-react"
import Link from "next/link"
import { Copy } from "@/components/ui/copy"
import { GithubProfileCard, GithubRepoCard } from "@/components/ui/github"
import { Image } from "@/components/ui/image"
import { Panel } from "@/components/ui/panel"
import { SocialProfile } from "@/components/ui/social-profile"
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsPanels,
  TabsTab,
} from "@/components/ui/tabs"
import { Tweet } from "@/components/ui/tweet"
import { WebPreview } from "@/components/ui/web-preview"
import { YouTube } from "@/components/ui/youtube"
import type { SelectLink } from "@/db/schema"
import type { Made } from "@/lib/activity"
import {
  getLinkDisplayText,
  getLinkIcon,
  getLinkPretextIcon,
  getLinkUrl,
} from "@/lib/links"
import type { Presence } from "@/lib/presence"
import { Quote } from "./quote"

/** GitHub's calendar inside its profile card: square days, at no less than 8px a
 *  day (36rem for 53 weeks), the oldest weeks cut where the card is narrower and
 *  the latest kept. */
const CALENDAR =
  "[&_[data-slot=github-calendar]]:flex [&_[data-slot=github-calendar]]:flex-col [&_[data-slot=github-calendar]]:items-end [&_[data-slot=github-calendar]]:overflow-hidden [&_[data-slot=github-calendar]>figcaption]:self-start [&_[data-slot=github-calendar]>svg:first-of-type]:min-w-[36rem] [&_[data-slot=github-calendar]_rect]:[rx:0]"

/** What a link shows of the person behind it, from what the page read
 *  (lib/presence); nothing where there was nothing to read. Each is the
 *  registry's own and draws its own surface, which inside the box of tabs is
 *  the inset one (@ag/panel): all of them alike, none styled here. */
function PresenceOf({
  link,
  presence,
}: {
  link: SelectLink
  presence: Presence
}) {
  if (link.platform === "github" && presence.github)
    return <GithubProfileCard profile={presence.github} className={CALENDAR} />
  if (link.platform === "website" && presence.website)
    return <WebPreview facts={presence.website} />
  if (link.platform === "youtube" && presence.youtube)
    return <YouTube video={presence.youtube} />
  if (link.platform === "twitter" && presence.tweet)
    return <Tweet tweet={presence.tweet} />
  const telegram = presence.profiles.find((p) => p.platform === "telegram")
  if (link.platform === "telegram" && telegram)
    return <SocialProfile facts={telegram} />
  return null
}

/** The way to a link, one quiet line over what it shows: the handle, opening it,
 *  and right beside it the registry's copy (@ag/copy) of what a reader takes away,
 *  the address for an email and the URL for the rest. Beside, never across the
 *  line: a copy button at the far end reads as nobody's. */
function LinkLine({ link }: { link: SelectLink }) {
  const value = link.value ?? ""
  const url = getLinkUrl(link.platform, value)
  return (
    <div className="flex min-w-0 items-center gap-1 self-start px-1">
      <Link
        href={url}
        // rel="me": this page and that profile are the same person, which
        // Mastodon and other IndieWeb readers check to mark the link verified.
        rel="me"
        className="group flex min-w-0 items-center gap-2.5 text-[15px] text-foreground/75 transition-colors hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
      >
        <span className="text-foreground/45">
          {getLinkPretextIcon(link.platform)}
        </span>
        <span className="truncate">
          {getLinkDisplayText(link.platform, value)}
        </span>
        <ArrowUpRight
          strokeWidth={1.5}
          aria-hidden
          className="opacity-40 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        />
      </Link>
      <Copy
        value={link.platform === "email" ? value : url}
        className="size-9 rounded-full"
      />
    </div>
  )
}

/** The tab of what they made lately: a value no link's id can be (ids are UUIDs). */
const LATEST = "latest"

/** A day as "latest" dates it: fixed, in UTC, so the cached page and the browser
 *  print the same words and a page never says "2h ago" a day later. */
const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** What each kind of thing is, said over its card with its day. */
const MADE_SAYS: Record<Made["kind"], string> = {
  code: "pushed",
  post: "wrote",
  video: "uploaded",
}

/** Where each kind of thing lives, its mark the platform's own (the card's and
 *  the tabs'). */
const MADE_ON: Record<Made["kind"], "github" | "website" | "youtube"> = {
  code: "github",
  post: "website",
  video: "youtube",
}

/** One thing made, whole: drawn by the registry's own card for it (a repository
 *  with its latest commits, a post's preview, a video's player), under a quiet
 *  line of where it lives (its mark: the platform's, a post's own site's icon
 *  where it has one), what was done and when. */
function MadeCard({ item }: { item: Made }) {
  const favicon = item.kind === "post" ? item.page.favicon : undefined
  return (
    <article className="flex flex-col gap-2">
      <p className="flex items-center gap-2 px-1 font-mono text-foreground/45 text-xs [&_svg]:size-4 [&_svg]:text-foreground/80">
        {favicon ? (
          <Image src={favicon} alt="" className="size-4 rounded-xs" />
        ) : (
          getLinkIcon(MADE_ON[item.kind])
        )}
        <span>
          {MADE_SAYS[item.kind]} · {DAY.format(new Date(item.at))}
        </span>
      </p>
      {item.kind === "code" ? (
        <GithubRepoCard repo={item.repo} commits={3} />
      ) : item.kind === "post" ? (
        <WebPreview facts={item.page} />
      ) : (
        <YouTube video={item.video} />
      )}
    </article>
  )
}

/** A profile's links as one box of tabs (@ag/tabs in an @ag/panel): a single
 *  surface whose head is the strip of their icons (the chosen one named,
 *  `labels="active"`) and whose body is the person's presence there, under what
 *  they say of it (its note); "latest", first, what they made lately. `links`
 *  arrive filtered and ordered by the caller (lib/data): the public ones. They are
 *  changed on the card itself (components/profile-card). */
export function ProfileLinks({
  links,
  presence,
  made,
}: {
  links: SelectLink[]
  presence: Presence
  /** What they made lately (lib/activity): "latest", first, where there is any. */
  made: Made[]
}) {
  if (links.length === 0) return null

  return (
    <Tabs
      defaultValue={made.length > 0 ? LATEST : links[0]?.id}
      size="lg"
      labels="active"
      className="w-full"
    >
      {/* Held still beside the card (components/profile-layout, `links`), at
          most as tall as the card's side (`--links-cap`): a long tab
          ("latest") scrolls inside the box, under its strip, and hands the
          scroll to the page at its top and its foot. On a phone, no cap: the
          page scrolls it. */}
      <Panel
        maxHeight="var(--links-cap)"
        headHeight="3.5rem"
        head={
          <TabsList>
            {made.length > 0 && (
              <TabsTab value={LATEST} icon={<Clock strokeWidth={1} />}>
                latest
              </TabsTab>
            )}
            {links.map(({ id, platform, label }) => (
              // The site's lowercase voice: a known platform by its id
              // ("github"), a link by its owner's own words.
              <TabsTab key={id} value={id} icon={getLinkIcon(platform)}>
                {label ?? platform}
              </TabsTab>
            ))}
          </TabsList>
        }
      >
        {/* A track (@ag/tabs `TabsPanels`, on the lightbox's own engine): a
            finger or a trackpad swipes from one link to the next, one a
            gesture, held at the first and the last. */}
        <TabsPanels>
          {made.length > 0 && (
            <TabsPanel value={LATEST} className="flex flex-col gap-6">
              {made.map((item) => (
                <MadeCard key={`${item.kind}:${item.at}`} item={item} />
              ))}
            </TabsPanel>
          )}
          {links.map((link) => (
            <TabsPanel
              key={link.id}
              value={link.id}
              className="flex flex-col gap-4"
            >
              <LinkLine link={link} />
              {link.note && <Quote text={link.note} />}
              <PresenceOf link={link} presence={presence} />
            </TabsPanel>
          ))}
        </TabsPanels>
      </Panel>
    </Tabs>
  )
}
