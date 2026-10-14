import { Quote as AgQuote } from "./ui/quote";

/** A link's note, inside its tab: the person's own words about that link, so
 *  set as their words on their page, not as a quotation. */
export function Quote({ text }: { text: string }) {
  return (
    <p className="px-1 text-[15px] leading-relaxed font-light text-pretty text-foreground/75">
      {text}
    </p>
  );
}

/** A day as a testimonial dates it: fixed, in UTC, so the static page and the
 *  browser print the same words and a prerendered page never says "2h ago" a month
 *  later. */
const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** A comment the profile's owner pinned, as @ag/quote: somebody else's words, their
 *  face and name (to their own page), the day. `prose`, on the surface the page's
 *  MaterialProvider says, glass on e-id. */
export function Testimonial({
  text,
  name,
  username,
  image,
  date,
}: {
  text: string;
  name: string;
  username: string;
  image: string;
  date: Date;
}) {
  return (
    <AgQuote
      variant="prose"
      text={text}
      author={{
        name: name || `@${username}`,
        href: `/${username}`,
        avatar: image || undefined,
      }}
      date={DAY.format(date)}
      // No surface of its own: a vouch lies in the page's ground (the profile
      // engraves it there), not on a step above it.
      className="w-full bg-transparent px-0 [&_[data-slot=quote-mark]]:left-0"
    />
  );
}
