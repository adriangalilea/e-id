import { Quote as AgQuote } from "./ui/quote";
import { Textarea } from "./ui/textarea";

/** A social's context line, inside its tab: the person's own words about that
 *  place, so set as their words on their page, not as a quotation. */
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
      className="w-full"
    />
  );
}

export function InputQuote({
  text,
  name,
  placeholder,
}: {
  text: string;
  name: string;
  placeholder: string;
}) {
  return (
    <Textarea
      placeholder={placeholder}
      name={name}
      defaultValue={text ?? ""}
      className="w-full rounded-lg border border-border bg-card p-3 text-[16px] font-light
        placeholder:text-muted-foreground focus-visible:border-foreground/40
        focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-hidden
        disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
