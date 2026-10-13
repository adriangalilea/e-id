import { cn } from "@/lib/utils";
import Link from "next/link";
import { RelativeTime } from "./ui/relative-time";
import CustomAvatar from "./custom_avatar";
import { Textarea } from "./ui/textarea";

/** Somebody's words: a rule down their left, the words beside it. */
const RULE = "border-l-2 border-foreground/70 pl-5";

const SIZE = {
  /** A profile's own message, the first thing read after the name. */
  lead: "text-xl leading-snug sm:text-2xl",
  /** A social's context line, inside its tab. */
  body: "text-[15px] leading-relaxed text-foreground/75",
};

export function Quote({
  text,
  size = "body",
}: {
  text: string;
  size?: keyof typeof SIZE;
}) {
  return (
    <blockquote className={cn(RULE, SIZE[size], "font-light text-pretty")}>
      <p>{text}</p>
    </blockquote>
  );
}

/** A comment the profile's owner pinned: the words, then who wrote them and when. */
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
    <figure className="flex w-full flex-col gap-5 border border-border bg-card p-5 sm:p-6">
      <blockquote className="text-[17px] leading-relaxed font-light text-pretty text-foreground/85">
        <p>{text}</p>
      </blockquote>
      <figcaption className="flex items-center justify-between gap-4">
        <Link
          href={`/${username}`}
          className="group flex min-w-0 items-center gap-3"
        >
          <CustomAvatar image={image} username={username} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] group-hover:underline">
              {name}
            </span>
            <span className="truncate font-mono text-[11px] text-foreground/45">
              @{username}
            </span>
          </span>
        </Link>
        <RelativeTime
          at={date.getTime()}
          className="shrink-0 font-mono text-[11px] text-foreground/45"
        />
      </figcaption>
    </figure>
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
    <div className="border-l-2 border-foreground/70">
      <Textarea
        placeholder={placeholder}
        name={name}
        defaultValue={text ?? ""}
        className="w-full border border-l-0 border-border bg-card p-3 text-[16px] font-light
          placeholder:text-muted-foreground focus-visible:border-foreground/40
          focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-hidden
          disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
