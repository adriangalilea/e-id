import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { INSET } from "@/components/surface"
import { Copy } from "@/components/ui/copy"
import { GithubProfileCard } from "@/components/ui/github"
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
 *  (lib/presence); nothing where there was nothing to read. */
function PresenceOf({
  link,
  presence,
}: {
  link: SelectLink
  presence: Presence
}) {
  if (link.platform === "github" && presence.github)
    return (
      <GithubProfileCard
        profile={presence.github}
        className={`${INSET} ${CALENDAR}`}
      />
    )
  if (link.platform === "website" && presence.website)
    return <WebPreview facts={presence.website} className={INSET} />
  if (link.platform === "youtube" && presence.youtube)
    return <YouTube video={presence.youtube} />
  if (link.platform === "twitter" && presence.tweet)
    return <Tweet tweet={presence.tweet} className={INSET} />
  const telegram = presence.profiles.find((p) => p.platform === "telegram")
  if (link.platform === "telegram" && telegram)
    // Stands in the tab's frame, no box of its own (the box of tabs is the
    // frame; @ag/social-profile draws none inside a Panel by itself).
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

/** A profile's links as one box of tabs (@ag/tabs in an @ag/panel): a single
 *  surface whose head is the strip of their icons (the chosen one named,
 *  `labels="active"`) and whose body is the person's presence there, under what
 *  they say of it (its note). The head pins under the site's bar (5rem, the
 *  layout's room for it) while a long panel scrolls under it. `links` arrive
 *  filtered and ordered by the caller (lib/data): the public ones. They are
 *  changed on the card itself (components/profile-card). */
export function ProfileLinks({
  links,
  presence,
}: {
  links: SelectLink[]
  presence: Presence
}) {
  if (links.length === 0) return null

  return (
    <Tabs
      defaultValue={links[0]?.id}
      size="lg"
      labels="active"
      className="w-full"
    >
      <Panel
        pin="5rem"
        glide
        headHeight="3.5rem"
        head={
          <TabsList>
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
        {/* A track (@ag/tabs `TabsPanels`): a finger or a trackpad swipes from
            one link to the next, one a gesture. */}
        <TabsPanels>
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
