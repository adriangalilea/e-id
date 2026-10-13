import { Heart, MessageCircle } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"
import type {
  TweetAuthor,
  Tweet as TweetFacts,
  TweetMedia,
  TweetRun,
} from "@/lib/tweet-data"
import { CardLink } from "@/components/ui/card-link"
import { Img } from "@/components/ui/img"
import { Video } from "@/components/ui/video"
import { WebPreview } from "@/components/ui/web-preview"

export interface TweetProps {
  tweet: TweetFacts
  className?: string
}

const LINK = "text-[#1d9bf0] hover:underline"
const MUTED = "text-foreground/55"
const ANCHOR = { target: "_blank", rel: "noopener noreferrer" } as const

const DATE = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const COUNT = new Intl.NumberFormat("en", { notation: "compact" })

const BADGE: Record<NonNullable<TweetAuthor["verified"]>, string> = {
  blue: "#1d9bf0",
  business: "#e2b719",
  government: "#829aab",
}

function Verified({ kind }: { kind: NonNullable<TweetAuthor["verified"]> }) {
  return (
    <svg
      data-slot="tweet-verified"
      viewBox="0 0 22 22"
      className="size-[1.1em] shrink-0"
      role="img"
      aria-label={`${kind === "blue" ? "" : `${kind} `}verified account`}
    >
      <path
        fill={BADGE[kind]}
        d="M20.4 11c0-1.3-.8-2.4-2-3 .4-1.3.2-2.6-.7-3.6-.9-.9-2.3-1.1-3.6-.7-.6-1.2-1.7-2-3-2s-2.4.8-3 2c-1.3-.4-2.7-.2-3.6.7-.9.9-1.1 2.3-.7 3.6-1.2.6-2 1.7-2 3s.8 2.4 2 3c-.4 1.3-.2 2.7.7 3.6.9.9 2.3 1.1 3.6.7.6 1.2 1.7 2 3 2s2.4-.8 3-2c1.3.4 2.7.2 3.6-.7.9-.9 1.1-2.3.7-3.6 1.2-.6 2-1.7 2-3z"
      />
      <path
        fill="#fff"
        d="m9.6 14.9-3.3-3.3 1.3-1.3 2 2 4.6-4.9 1.3 1.2-5.9 6.3z"
      />
    </svg>
  )
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  )
}

function Body({ runs, className }: { runs: TweetRun[]; className?: string }) {
  return (
    <p
      data-slot="tweet-body"
      className={cn("whitespace-pre-wrap break-words", className)}
    >
      {runs.map((r, i) =>
        r.href ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: runs are positional and never reorder
          <a key={i} href={r.href} className={LINK} {...ANCHOR}>
            {r.text}
          </a>
        ) : (
          r.text
        ),
      )}
    </p>
  )
}

/** One to four pictures as X lays them out: one at its own aspect (never taller than
 *  3:4), more in a 16:9 frame, two side by side, three as a tall one and a stack, four
 *  as a grid. */
const TALLEST = 3 / 4
const FRAME = 16 / 9
const GRID: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2",
  4: "grid-cols-2 grid-rows-2",
}

function Media({ media, url }: { media: TweetMedia[]; url: string }) {
  if (media.length > 4)
    throw new Error(`tweet ${url}: ${media.length} pictures, X shows four`)
  const one = media.length === 1 ? (media[0] as TweetMedia) : undefined
  const aspect = one ? Math.max(one.width / one.height, TALLEST) : FRAME
  return (
    <div
      data-slot="tweet-media"
      className={cn(
        "grid aspect-(--ag-tweet-aspect) gap-0.5 clip-rounded rounded-2xl border border-border",
        GRID[media.length],
      )}
      style={{ "--ag-tweet-aspect": String(aspect) } as React.CSSProperties}
    >
      {media.map((m, i) =>
        m.kind === "photo" ? (
          <Img
            // biome-ignore lint/suspicious/noArrayIndexKey: media are positional
            key={i}
            src={m.src}
            alt={m.alt ?? ""}
            width={m.width}
            height={m.height}
            loading="lazy"
            className="size-full min-h-0 object-cover"
          />
        ) : (
          // A video waits for the person and keeps the browser's own bar, as an
          // embed should; a gif plays on sight and loops, as X plays one.
          <Video
            // biome-ignore lint/suspicious/noArrayIndexKey: media are positional
            key={i}
            src={m.src}
            poster={m.poster}
            optimizePoster={false}
            play={m.kind === "gif" ? "visible" : "manual"}
            loop={m.kind === "gif"}
            preload="none"
            label={m.kind === "gif" ? "gif" : "video"}
            className="min-h-0 bg-black"
            videoClassName="object-contain"
          />
        ),
      )}
    </div>
  )
}

function Names({ author, small }: { author: TweetAuthor; small?: boolean }) {
  const profile = `https://x.com/${author.handle.slice(1)}`
  return (
    <a
      href={profile}
      {...ANCHOR}
      data-slot="tweet-author"
      className={cn(
        "flex min-w-0 gap-x-1 leading-5",
        small ? "items-center" : "flex-col",
      )}
    >
      <span className="flex min-w-0 items-center gap-1 font-bold hover:underline">
        <span className="truncate">{author.name}</span>
        {author.verified && <Verified kind={author.verified} />}
      </span>
      <span className={cn("truncate", MUTED)}>{author.handle}</span>
    </a>
  )
}

function Avatar({ author, size }: { author: TweetAuthor; size: string }) {
  return (
    <a
      href={`https://x.com/${author.handle.slice(1)}`}
      {...ANCHOR}
      // The names beside it are the same link; the keyboard visits it once.
      tabIndex={-1}
      className="shrink-0"
    >
      <Img
        src={author.avatar}
        alt={author.name}
        className={cn(
          size,
          "bg-foreground/8 object-cover",
          author.square ? "rounded-[22%]" : "rounded-full",
        )}
      />
    </a>
  )
}

function Quote({ tweet }: { tweet: TweetFacts }) {
  return (
    // The quoted post opens itself, not the post quoting it: the innermost card wins.
    <CardLink
      href={tweet.url}
      data-slot="tweet-quote"
      className="relative space-y-2 rounded-2xl border border-border p-3 text-[15px] transition-colors hover:bg-foreground/3"
    >
      <div className="flex items-center gap-1.5">
        <Avatar author={tweet.author} size="size-5" />
        <Names author={tweet.author} small />
        <span className={MUTED} aria-hidden="true">
          ·
        </span>
        <a
          href={tweet.url}
          {...ANCHOR}
          className={cn("shrink-0 hover:underline", MUTED)}
        >
          <time dateTime={tweet.date}>{DATE.format(new Date(tweet.date))}</time>
        </a>
      </div>
      {tweet.body.length > 0 && <Body runs={tweet.body} />}
      {tweet.media.length > 0 && <Media media={tweet.media} url={tweet.url} />}
      {tweet.card && <WebPreview facts={tweet.card} style="x" />}
    </CardLink>
  )
}

export function Tweet({ tweet, className }: TweetProps) {
  return (
    // The whole post opens the post on X, as X's own embed does; a keyboard gets
    // there through the mark and the date.
    <CardLink
      href={tweet.url}
      data-slot="tweet"
      className={cn(
        "rounded-2xl border border-border bg-card font-sans text-[15px] text-card-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--card),var(--foreground)_3%)]",
        className,
      )}
    >
      <article className="space-y-3 p-4">
        <header className="flex items-start gap-3">
          <Avatar author={tweet.author} size="size-10" />
          <div className="min-w-0 flex-1">
            <Names author={tweet.author} />
          </div>
          <a
            href={tweet.url}
            {...ANCHOR}
            aria-label="View on X"
            className="text-foreground/80 hover:text-foreground"
          >
            <XMark />
          </a>
        </header>
        {tweet.body.length > 0 && (
          <Body runs={tweet.body} className="text-[17px] leading-6" />
        )}
        {tweet.media.length > 0 && (
          <Media media={tweet.media} url={tweet.url} />
        )}
        {tweet.card && <WebPreview facts={tweet.card} style="x" />}
        {tweet.quote && <Quote tweet={tweet.quote} />}
        <a
          href={tweet.url}
          {...ANCHOR}
          className={cn("block hover:underline", MUTED)}
        >
          <time dateTime={tweet.date}>{DATE.format(new Date(tweet.date))}</time>
          {tweet.edited && " · edited"}
        </a>
        <footer
          data-slot="tweet-counts"
          className={cn(
            "flex gap-6 border-border border-t pt-3 font-medium",
            MUTED,
          )}
        >
          <a
            href={tweet.url}
            {...ANCHOR}
            className="flex items-center gap-1.5 hover:text-[#f91880]"
          >
            <Heart className="size-[1.15em]" aria-hidden="true" />
            {COUNT.format(tweet.likes)}
            <span className="sr-only"> likes</span>
          </a>
          <a
            href={tweet.url}
            {...ANCHOR}
            className="flex items-center gap-1.5 hover:text-[#1d9bf0]"
          >
            <MessageCircle className="size-[1.15em]" aria-hidden="true" />
            {COUNT.format(tweet.replies)}
            <span className="sr-only"> replies</span>
          </a>
        </footer>
      </article>
    </CardLink>
  )
}
