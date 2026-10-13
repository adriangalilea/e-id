import {
  BookMarked,
  Building2,
  CircleCheck,
  CircleDot,
  CircleSlash,
  GitFork,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Link2,
  MapPin,
  MessageSquare,
  Scale,
  Star,
  Users,
} from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"
import type {
  GithubComment,
  GithubCommit,
  GithubDay,
  GithubFacts,
  GithubLabel,
  GithubProfile,
  GithubReaction,
  GithubRepo,
  GithubState,
  GithubThread,
  GithubThreadHeader,
  GithubUser,
} from "@/lib/github-data"
import { CardLink } from "@/components/ui/card-link"
import { Reactions } from "@/components/ui/reactions"

const ANCHOR = { target: "_blank", rel: "noopener noreferrer" } as const
const CARD =
  "group rounded-xl border border-border bg-card font-sans text-[15px] text-card-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]"
const MUTED = "text-foreground/60"
const LINK = "text-[#0969da] hover:underline dark:text-[#4493f8]"
const ICON = "size-4 shrink-0"

const DATE = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const date = (iso: string) => DATE.format(new Date(iso))
const COUNT = new Intl.NumberFormat("en", { notation: "compact" })

// ── state ──

const STATE: Record<GithubState, { word: string; ink: string; fill: string }> =
  {
    open: {
      word: "Open",
      ink: "text-[#1a7f37] dark:text-[#3fb950]",
      fill: "bg-[#1f883d] dark:bg-[#238636]",
    },
    draft: {
      word: "Draft",
      ink: "text-[#59636e] dark:text-[#9198a1]",
      fill: "bg-[#59636e] dark:bg-[#656c76]",
    },
    completed: {
      word: "Closed",
      ink: "text-[#8250df] dark:text-[#ab7df8]",
      fill: "bg-[#8250df] dark:bg-[#8957e5]",
    },
    "not-planned": {
      word: "Closed",
      ink: "text-[#59636e] dark:text-[#9198a1]",
      fill: "bg-[#59636e] dark:bg-[#656c76]",
    },
    merged: {
      word: "Merged",
      ink: "text-[#8250df] dark:text-[#ab7df8]",
      fill: "bg-[#8250df] dark:bg-[#8957e5]",
    },
    closed: {
      word: "Closed",
      ink: "text-[#d1242f] dark:text-[#f85149]",
      fill: "bg-[#cf222e] dark:bg-[#da3633]",
    },
  }

function StateIcon({
  kind,
  state,
  className,
}: {
  kind: "issue" | "pr"
  state: GithubState
  className?: string
}) {
  const Icon =
    kind === "pr"
      ? state === "merged"
        ? GitMerge
        : state === "closed"
          ? GitPullRequestClosed
          : state === "draft"
            ? GitPullRequestDraft
            : GitPullRequest
      : state === "completed"
        ? CircleCheck
        : state === "not-planned"
          ? CircleSlash
          : CircleDot
  return <Icon aria-hidden="true" className={cn(ICON, className)} />
}

function StatePill({ thread }: { thread: GithubThreadHeader }) {
  const s = STATE[thread.state]
  return (
    <span
      data-slot="github-state"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-[13px] text-white",
        s.fill,
      )}
    >
      <StateIcon kind={thread.kind} state={thread.state} className="size-3.5" />
      {s.word}
    </span>
  )
}

// ── parts ──

/** A face as GitHub draws it: a person round, an organization a rounded square. */
function Avatar({
  user,
  size,
}: {
  user: Pick<GithubUser, "avatar" | "org">
  size: string
}) {
  return (
    // biome-ignore lint/performance/noImgElement: GitHub's avatar service, a fixed small size
    <img
      src={user.avatar}
      alt=""
      className={cn(
        size,
        "shrink-0 bg-foreground/8 object-cover",
        user.org ? "rounded-[22%]" : "rounded-full",
      )}
    />
  )
}

/** Reactions as GitHub lists them under a post: the emoji and how many gave it, as
 *  `reactions`' readout. Never yours (the facts were fetched with no viewer) and never
 *  buttons: pressing one here would promise a reaction this page cannot send. */
function Given({ reactions }: { reactions: GithubReaction[] }) {
  if (reactions.length === 0) return null
  return <Reactions reactions={reactions.map((r) => ({ ...r, mine: false }))} />
}

/** Commits as GitHub lists them: who, the first line of the message, the short sha and
 *  the day, each a link to the commit. */
function Commits({
  commits,
  count,
}: {
  commits: GithubCommit[]
  count: number
}) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error(`github: commits must be a whole number from 1`)
  const shown = commits.slice(0, count)
  if (shown.length === 0) return null
  return (
    <ol
      data-slot="github-commits"
      className="divide-y divide-border overflow-hidden rounded-lg border border-border text-[13px]"
    >
      {shown.map((c) => (
        <li key={c.sha} className="flex items-center gap-2 px-3 py-2">
          <Avatar user={c.author} size="size-4" />
          <a
            href={c.url}
            {...ANCHOR}
            className="min-w-0 flex-1 truncate hover:underline"
          >
            {c.message}
          </a>
          <a
            href={c.url}
            {...ANCHOR}
            className={cn("shrink-0 font-mono text-[12px]", LINK)}
          >
            {c.sha.slice(0, 7)}
          </a>
          <time dateTime={c.date} className={cn("shrink-0", MUTED)}>
            {date(c.date)}
          </time>
        </li>
      ))}
    </ol>
  )
}

function UserLink({ user }: { user: GithubUser }) {
  return (
    <a href={user.url} {...ANCHOR} className="font-semibold hover:underline">
      {user.login}
    </a>
  )
}

/** A label in its own colour, legible on either ground: a wash of the colour, its rim,
 *  and the text mixed toward the page's ink. */
function Label({ label }: { label: GithubLabel }) {
  return (
    <span
      data-slot="github-label"
      style={{ "--ag-gh-label": `#${label.color}` } as React.CSSProperties}
      className="rounded-full border border-[color-mix(in_srgb,var(--ag-gh-label)_45%,transparent)] bg-[color-mix(in_srgb,var(--ag-gh-label)_18%,transparent)] px-2 py-px font-medium text-[12px] text-[color-mix(in_srgb,var(--ag-gh-label)_55%,var(--foreground))]"
    >
      {label.name}
    </span>
  )
}

/** GitHub's own markdown rendering, sanitized by GitHub, styled here: the page's type,
 *  GitHub's link blue, code on a step of the surface, and the syntax colours GitHub's
 *  highlighter names (`pl-*`). edge: GitHub's <pre> is GitHub's markup, framed on
 *  itself; a long line scrolls in it as on GitHub. */
const MARKDOWN = cn(
  "break-words leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0",
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:font-semibold [&_h1]:text-lg [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold",
  "[&_a]:text-[#0969da] [&_a:hover]:underline dark:[&_a]:text-[#4493f8]",
  "[&_code]:rounded-md [&_code]:bg-foreground/8 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-foreground/5 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-normal [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_blockquote]:my-2 [&_blockquote]:border-foreground/20 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-foreground/60",
  "[&_img]:max-w-full [&_hr]:my-4 [&_hr]:border-border",
  "[&_.pl-k]:text-[#cf222e] [&_.pl-s]:text-[#0a3069] [&_.pl-c1]:text-[#0550ae] [&_.pl-en]:text-[#6639ba] [&_.pl-c]:text-[#59636e] [&_.pl-smi]:text-inherit",
  "dark:[&_.pl-k]:text-[#ff7b72] dark:[&_.pl-s]:text-[#a5d6ff] dark:[&_.pl-c1]:text-[#79c0ff] dark:[&_.pl-en]:text-[#d2a8ff] dark:[&_.pl-c]:text-[#9198a1]",
)

function Markdown({ html }: { html: string }) {
  return (
    <div
      data-slot="github-markdown"
      className={MARKDOWN}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: GitHub's own sanitized rendering, fetched by the author at authoring time
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** The thread a card is about, on one line: its state, where it lives, its title. */
function ThreadLine({ thread }: { thread: GithubThreadHeader }) {
  return (
    <a
      href={thread.url}
      {...ANCHOR}
      className="group flex min-w-0 items-center gap-1.5 text-[14px]"
    >
      <StateIcon
        kind={thread.kind}
        state={thread.state}
        className={STATE[thread.state].ink}
      />
      <span className={cn("shrink-0", MUTED)}>
        {thread.repo}#{thread.number}
      </span>
      <span className="truncate font-medium group-hover:underline">
        {thread.title}
      </span>
    </a>
  )
}

// ── cards ──

export function GithubRepoCard({
  repo,
  commits,
  className,
}: {
  repo: GithubRepo
  /** List the default branch's latest commits under the card, this many. */
  commits?: number
  className?: string
}) {
  const [owner, name] = repo.name.split("/")
  return (
    <CardLink
      href={repo.url}
      data-slot="github-repo"
      className={cn(CARD, "space-y-3 p-4", className)}
    >
      <div className="flex items-center gap-2">
        <BookMarked aria-hidden="true" className={cn(ICON, MUTED)} />
        <a
          href={repo.url}
          {...ANCHOR}
          className="min-w-0 truncate text-[#0969da] hover:underline dark:text-[#4493f8]"
        >
          {owner}/<span className="font-semibold">{name}</span>
        </a>
        {repo.archived && (
          <span className="rounded-full border border-[#9a6700]/50 px-2 text-[#9a6700] text-[12px] dark:border-[#d29922]/50 dark:text-[#d29922]">
            Archived
          </span>
        )}
      </div>
      {repo.description && (
        <p className={cn("line-clamp-2", MUTED)}>{repo.description}</p>
      )}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.map((t) => (
            <a
              key={t}
              href={`https://github.com/topics/${t}`}
              {...ANCHOR}
              className="rounded-full bg-[#ddf4ff] px-2.5 py-0.5 font-medium text-[#0969da] text-[12px] hover:bg-[#0969da] hover:text-white dark:bg-[#388bfd]/10 dark:text-[#4493f8] dark:hover:bg-[#4493f8] dark:hover:text-black"
            >
              {t}
            </a>
          ))}
        </div>
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]",
          MUTED,
        )}
      >
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ background: repo.language.color }}
            />
            {repo.language.name}
          </span>
        )}
        <a
          href={`${repo.url}/stargazers`}
          {...ANCHOR}
          className="flex items-center gap-1 hover:text-[#0969da] dark:hover:text-[#4493f8]"
        >
          <Star aria-hidden="true" className="size-3.5" />
          {COUNT.format(repo.stars)}
          <span className="sr-only"> stars</span>
        </a>
        <a
          href={`${repo.url}/forks`}
          {...ANCHOR}
          className="flex items-center gap-1 hover:text-[#0969da] dark:hover:text-[#4493f8]"
        >
          <GitFork aria-hidden="true" className="size-3.5" />
          {COUNT.format(repo.forks)}
          <span className="sr-only"> forks</span>
        </a>
        {repo.license && (
          <span className="flex items-center gap-1">
            <Scale aria-hidden="true" className="size-3.5" />
            {repo.license}
          </span>
        )}
        <span>Updated {date(repo.pushedAt)}</span>
      </div>
      {commits !== undefined && (
        <Commits commits={repo.commits} count={commits} />
      )}
    </CardLink>
  )
}

export function GithubThreadCard({
  thread,
  body = false,
  lines,
  commits,
  className,
}: {
  thread: GithubThread
  /** Draw the opening post under the header, as the thread's first comment. */
  body?: boolean
  /** Cut that opening post at this many lines. Whole when unset. */
  lines?: number
  /** A pull request: list its last commits, this many. */
  commits?: number
  className?: string
}) {
  const verb =
    thread.state === "merged" ? "merged" : thread.closedAt ? "closed" : "opened"
  return (
    <CardLink
      href={thread.url}
      data-slot="github-thread"
      className={cn(CARD, "space-y-3 p-4", className)}
    >
      <div className={cn("flex items-center gap-2 text-[13px]", MUTED)}>
        <Avatar user={thread.author} size="size-5" />
        <span className="min-w-0 truncate">{thread.repo}</span>
        <span aria-hidden="true">·</span>
        <span>{thread.kind === "pr" ? "Pull request" : "Issue"}</span>
      </div>
      <a
        href={thread.url}
        {...ANCHOR}
        className="block font-semibold text-[18px] leading-snug hover:underline"
      >
        {thread.title}{" "}
        <span className="font-normal text-foreground/50">#{thread.number}</span>
      </a>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]",
          MUTED,
        )}
      >
        <StatePill thread={thread} />
        <span>
          <UserLink user={thread.author} /> opened on{" "}
          <time dateTime={thread.createdAt}>{date(thread.createdAt)}</time>
          {thread.closedAt && verb !== "opened" && (
            <>
              {", "}
              {verb} on{" "}
              <time dateTime={thread.closedAt}>{date(thread.closedAt)}</time>
            </>
          )}
        </span>
      </div>
      {thread.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {thread.labels.map((l) => (
            <Label key={l.name} label={l} />
          ))}
        </div>
      )}
      {body && thread.bodyHtml && (
        <div className="border-border border-t pt-3">
          <Body html={thread.bodyHtml} lines={lines} href={thread.url} />
        </div>
      )}
      <Given reactions={thread.reactions} />
      {commits !== undefined && thread.commits && (
        <Commits commits={thread.commits} count={commits} />
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 border-border border-t pt-3 text-[13px]",
          MUTED,
        )}
      >
        <span className="flex items-center gap-1">
          <MessageSquare aria-hidden="true" className="size-3.5" />
          {thread.comments} {thread.comments === 1 ? "comment" : "comments"}
        </span>
        {thread.diff && (
          <span className="font-mono">
            <span className="text-[#1a7f37] dark:text-[#3fb950]">
              +{thread.diff.additions.toLocaleString("en")}
            </span>{" "}
            <span className="text-[#d1242f] dark:text-[#f85149]">
              −{thread.diff.deletions.toLocaleString("en")}
            </span>{" "}
            · {thread.diff.files} {thread.diff.files === 1 ? "file" : "files"}
          </span>
        )}
        {thread.branches && (
          <span className="min-w-0 truncate font-mono text-[12px]">
            {thread.branches.base} ← {thread.branches.head}
          </span>
        )}
      </div>
    </CardLink>
  )
}

export function GithubCommentCard({
  comment,
  lines,
  className,
}: {
  comment: GithubComment
  /** Cut a long comment at this many lines, the rest a link away. Whole when unset. */
  lines?: number
  className?: string
}) {
  return (
    <CardLink
      href={comment.url}
      data-slot="github-comment"
      className={cn(CARD, "overflow-hidden", className)}
    >
      <div className="border-border border-b px-4 py-2.5">
        <ThreadLine thread={comment.thread} />
      </div>
      <div className="flex items-center gap-2 bg-foreground/[0.03] px-4 py-2 text-[14px]">
        <Avatar user={comment.author} size="size-6" />
        <span className="min-w-0 truncate">
          <UserLink user={comment.author} />{" "}
          <span className={MUTED}>
            commented on{" "}
            <a href={comment.url} {...ANCHOR} className="hover:underline">
              <time dateTime={comment.createdAt}>
                {date(comment.createdAt)}
              </time>
            </a>
          </span>
        </span>
      </div>
      <div className="px-4 py-3">
        <Body html={comment.bodyHtml} lines={lines} href={comment.url} />
      </div>
      {comment.reactions.length > 0 && (
        <div className="px-4 pb-3">
          <Given reactions={comment.reactions} />
        </div>
      )}
    </CardLink>
  )
}

/** How many lines the fade spans when a body is cut. */
const FADE_LINES = 4

/** A body, whole, or cut at `lines` lines of its own type with the rest fading out and
 *  a way to read it on GitHub. No measuring: the fade and the link sit AT the cut, so
 *  a body shorter than the cut ends before them and the clip hides both. */
function Body({
  html,
  lines,
  href,
}: {
  html: string
  lines?: number
  href: string
}) {
  if (lines === undefined) return <Markdown html={html} />
  if (!Number.isInteger(lines) || lines <= FADE_LINES)
    throw new Error(`github: lines must be a whole number over ${FADE_LINES}`)
  return (
    <div
      className="relative max-h-(--ag-gh-cut) overflow-hidden leading-relaxed"
      style={
        {
          "--ag-gh-cut": `${lines}lh`,
          "--ag-gh-fade": `${FADE_LINES}lh`,
          "--ag-gh-fade-top": `${lines - FADE_LINES}lh`,
          "--ag-gh-more-top": `${lines - 1}lh`,
        } as React.CSSProperties
      }
    >
      <Markdown html={html} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-(--ag-gh-fade-top) h-(--ag-gh-fade) bg-linear-to-b from-transparent to-card transition-colors group-hover:to-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]"
      />
      <a
        href={href}
        {...ANCHOR}
        className={cn(
          "absolute top-(--ag-gh-more-top) left-0 font-medium",
          LINK,
        )}
      >
        Read the rest on GitHub
      </a>
    </div>
  )
}

/** The website as typed, as a link: GitHub stores it without a scheme sometimes. */
const site = (w: string) => (/^https?:\/\//.test(w) ? w : `https://${w}`)

export function GithubProfileCard({
  profile,
  className,
}: {
  profile: GithubProfile
  className?: string
}) {
  return (
    <CardLink
      href={profile.url}
      data-slot="github-profile"
      className={cn(CARD, "space-y-4 p-4", className)}
    >
      <div className="flex items-center gap-4">
        <Avatar user={profile.user} size="size-16" />
        <div className="min-w-0">
          {profile.name && (
            <div className="truncate font-semibold text-[20px] leading-tight">
              {profile.name}
            </div>
          )}
          <a
            href={profile.url}
            {...ANCHOR}
            className={cn("text-[16px] hover:underline", MUTED)}
          >
            {profile.user.login}
          </a>
        </div>
      </div>
      {profile.bio && <p>{profile.bio}</p>}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]",
          MUTED,
        )}
      >
        <span className="flex items-center gap-1">
          <Users aria-hidden="true" className="size-3.5" />
          <span className="font-semibold text-foreground">
            {COUNT.format(profile.followers)}
          </span>{" "}
          followers ·{" "}
          <span className="font-semibold text-foreground">
            {COUNT.format(profile.following)}
          </span>{" "}
          following
        </span>
        <span className="flex items-center gap-1">
          <BookMarked aria-hidden="true" className="size-3.5" />
          <span className="font-semibold text-foreground">{profile.repos}</span>{" "}
          repositories
        </span>
        {profile.company && (
          <span className="flex items-center gap-1">
            <Building2 aria-hidden="true" className="size-3.5" />
            {profile.company}
          </span>
        )}
        {profile.location && (
          <span className="flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-3.5" />
            {profile.location}
          </span>
        )}
        {profile.website && (
          <a
            href={site(profile.website)}
            {...ANCHOR}
            className={cn("flex items-center gap-1", LINK)}
          >
            <Link2 aria-hidden="true" className="size-3.5" />
            {profile.website}
          </a>
        )}
      </div>
      <ContributionCalendar calendar={profile.calendar} />
    </CardLink>
  )
}

// ── the calendar ──

/** GitHub's five greens, by quartile, on light and on dark. */
const LEVEL = [
  "fill-[#ebedf0] dark:fill-[#151b23]",
  "fill-[#9be9a8] dark:fill-[#033a16]",
  "fill-[#40c463] dark:fill-[#196c2e]",
  "fill-[#30a14e] dark:fill-[#2ea043]",
  "fill-[#216e39] dark:fill-[#56d364]",
] as const

const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const LEFT = 28
const TOP = 16
const MONTH = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })

function dayTitle(d: GithubDay): string {
  const when = date(`${d.date}T00:00:00Z`)
  return d.count === 0
    ? `No contributions on ${when}`
    : `${d.count} contribution${d.count === 1 ? "" : "s"} on ${when}`
}

/** The last year as GitHub draws it: a column per week, Sunday on top, a square per day
 *  in the green of its quartile, the months over the columns where they begin. An SVG
 *  in its own units, so it scales to the width it is given; each day says its count on
 *  hover (`<title>`). */
export function ContributionCalendar({
  calendar,
  className,
}: {
  calendar: GithubProfile["calendar"]
  className?: string
}) {
  const weeks = calendar.weeks
  const width = LEFT + weeks.length * STEP
  const height = TOP + 7 * STEP
  // A month is named over the first week that starts in it, unless the previous name
  // sits closer than three columns (the first, partial month usually does).
  const months: { x: number; label: string }[] = []
  weeks.forEach((week, i) => {
    const first = week[0]
    if (!first) return
    const label = MONTH.format(new Date(`${first.date}T00:00:00Z`))
    const prev = i > 0 ? weeks[i - 1]?.[0] : undefined
    const changed =
      !prev || MONTH.format(new Date(`${prev.date}T00:00:00Z`)) !== label
    if (!changed) return
    const x = LEFT + i * STEP
    const last = months.at(-1)
    if (last && x - last.x < 3 * STEP) months.pop()
    months.push({ x, label })
  })
  return (
    <figure
      data-slot="github-calendar"
      className={cn("m-0 space-y-2", className)}
    >
      <figcaption className="text-[13px] text-foreground/60">
        {calendar.total.toLocaleString("en")} contributions in the last year
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${calendar.total.toLocaleString("en")} contributions in the last year`}
      >
        <g className="fill-foreground/55 text-[9px]">
          {months.map((m) => (
            <text key={m.x} x={m.x} y={10}>
              {m.label}
            </text>
          ))}
          {(["Mon", "Wed", "Fri"] as const).map((d, i) => (
            <text key={d} x={0} y={TOP + (2 * i + 1) * STEP + CELL - 1}>
              {d}
            </text>
          ))}
        </g>
        {weeks.map((week, x) => {
          // The first week of the year may start mid-week: its days keep their weekday.
          const offset = 7 - week.length
          return week.map((d, y) => (
            <rect
              key={d.date}
              x={LEFT + x * STEP}
              y={TOP + (x === 0 ? y + offset : y) * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              className={LEVEL[d.level]}
            >
              <title>{dayTitle(d)}</title>
            </rect>
          ))
        })}
      </svg>
      <div className="flex items-center justify-end gap-1 text-[12px] text-foreground/60">
        Less
        <svg
          viewBox={`0 0 ${5 * STEP} ${CELL}`}
          className="h-[10px] w-auto"
          aria-hidden="true"
        >
          {LEVEL.map((fill, i) => (
            <rect
              key={fill}
              x={i * STEP}
              y={0}
              width={CELL}
              height={CELL}
              rx={2}
              className={fill}
            />
          ))}
        </svg>
        More
      </div>
    </figure>
  )
}

/** Whatever a github.com URL turned out to be, drawn by its own card. */
export function Github({
  facts,
  lines,
  commits,
  className,
}: {
  facts: GithubFacts
  /** A comment, or an issue or pull request's opening post, cut at this many lines.
   *  An issue or pull request with `lines` shows its opening post; without, only its
   *  header. */
  lines?: number
  /** A repository's latest commits or a pull request's last ones, this many. */
  commits?: number
  className?: string
}) {
  if (facts.kind === "repo")
    return (
      <GithubRepoCard repo={facts} commits={commits} className={className} />
    )
  if (facts.kind === "comment")
    return (
      <GithubCommentCard comment={facts} lines={lines} className={className} />
    )
  if (facts.kind === "profile")
    return <GithubProfileCard profile={facts} className={className} />
  return (
    <GithubThreadCard
      thread={facts}
      body={lines !== undefined}
      lines={lines}
      commits={commits}
      className={className}
    />
  )
}
