import { cn } from "@/lib/utils";
import Link from "next/link";
import HumanTime from "./human_date";
import CustomAvatar from "./custom_avatar";
import { Textarea } from "./ui/textarea";

const borderStyle = "border-l-2 border-zinc-500";

const style =
  "w-full prose prose-zinc bg-zinc-950/5 p-3 font-light dark:prose-invert dark:bg-zinc-50/5";

const textStyle = "text-pretty italic";

export function Quote({ text }: { text: string }) {
  return (
    <blockquote className={cn(style, borderStyle)}>
      <p className={textStyle}>{text}</p>
    </blockquote>
  );
}

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
  date: string;
}) {
  return (
    <blockquote className={cn(style, borderStyle, "group")}>
      <p className={textStyle}>{text}</p>
      <footer className="flex items-end justify-between">
        <Link
          href={`/${username}`}
          className="flex items-center gap-4 bg-zinc-500/10 no-underline transition-colors
            hover:bg-zinc-500/20"
        >
          <CustomAvatar image={image} username={username!} />
          <span
            className="prose prose-zinc mr-4 whitespace-nowrap font-light dark:prose-invert
              hover:opacity-100"
          >
            {name}
          </span>
        </Link>
        <HumanTime date={date} dateOnly={true} />
      </footer>
    </blockquote>
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
    <div className={borderStyle}>
      <Textarea
        placeholder={placeholder}
        name={name}
        defaultValue={text ?? ""}
        className={cn(
          style,
          `border border-input text-[16px] text-zinc-950 placeholder:text-muted-foreground
          focus-visible:border-zinc-500 focus-visible:outline-none focus-visible:ring-0
          focus-visible:ring-transparent disabled:cursor-not-allowed disabled:opacity-50
          dark:text-zinc-50`,
        )}
      />
    </div>
  );
}
