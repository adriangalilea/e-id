import type { Writer } from "@/lib/data"
import { Quote as AgQuote } from "./ui/quote"

/** A link's note, inside its tab: the person's own words about that link, so
 *  set as their words on their page, not as a quotation. */
export function Quote({ text }: { text: string }) {
  return (
    <p className="text-pretty px-1 font-light text-[15px] text-foreground/75 leading-relaxed">
      {text}
    </p>
  )
}

/** A day as a testimonial dates it: fixed, in UTC, so the static page and the
 *  browser print the same words and a prerendered page never says "2h ago" a month
 *  later. */
const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** A comment the profile's owner pinned, as @ag/quote: somebody else's words, their
 *  face and name (to their own page), the day. `prose`, on the surface the page's
 *  MaterialProvider says, glass on e-id. A writer who left (lib/data `writerOf`)
 *  signs with no face and no page. */
export function Testimonial({
  text,
  writer,
  date,
}: {
  text: string
  writer: Writer
  date: Date
}) {
  return (
    <AgQuote
      variant="prose"
      text={text}
      author={{
        name: writer.name || `@${writer.username}`,
        href: writer.username ? `/${writer.username}` : undefined,
        avatar: writer.image || undefined,
      }}
      date={DAY.format(date)}
      // No surface of its own: a vouch lies in the page's ground (the profile
      // engraves it there), not on a step above it.
      className="w-full bg-transparent px-0 [&_[data-slot=quote-mark]]:left-0"
    />
  )
}
