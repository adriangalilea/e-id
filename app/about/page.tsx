import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EmojiDomain } from "@/components/brand";
import { Wide } from "@/components/frame";
import { INSET } from "@/components/surface";
import { Copy } from "@/components/ui/copy";
import { cn } from "@/lib/utils";
import linkInBio from "@/public/link_in_bio.webp";

export const metadata: Metadata = {
  title: "faq",
  alternates: { canonical: "/about" },
};

/** A link in an answer: the page's words, underlined in a hairline that lights up
 *  under the hand. */
const LINK =
  "text-foreground underline decoration-foreground/25 underline-offset-4 transition-colors hover:decoration-foreground";

/** An address a reader takes away: the address, and beside it its copy. */
function Address({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <Link href={href} className={cn(LINK, "font-mono text-sm no-underline")}>
        {children}
      </Link>
      <Copy value={href} className="size-8 rounded-full" />
    </li>
  );
}

/** Four questions, all open: with this few there is nothing to hide. Each is one
 *  row of the page in the profile's golden ratio, the question on the narrower
 *  side, the answer on the wider, rows parted by a hairline. */
const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is e-ID?",
    a: (
      <p>
        e-ID is a digital business card that allows you to share all your social
        links and contact information in one place.
      </p>
    ),
  },
  {
    q: "How can I create my e-ID?",
    a: (
      <p>
        Sign in with GitHub from the{" "}
        <Link href="/" className={LINK}>
          home page
        </Link>
        . Your page fills itself with your name, avatar, links and contribution
        graph, and you can edit it after.
      </p>
    ),
  },
  {
    q: "An emoji in the URL?",
    a: (
      <>
        <p>
          <Link
            href="https://en.wikipedia.org/wiki/Emoji_domain"
            className={LINK}
          >
            Emoji domains exist!
          </Link>{" "}
          They stand out as a link in bio, and Twitter and Instagram accept
          them.
        </p>
        <figure className={cn("overflow-hidden border", INSET)}>
          <Image
            src={linkInBio}
            alt="Example from e-id.to/Lulx"
            sizes="(min-width: 1024px) 44rem, 100vw"
            className="h-auto w-full"
          />
        </figure>
        <p>e-ID works with 3 domains. They all work interchangeably.</p>
        <ul className="flex flex-col gap-1">
          <Address href="https://e-id.to">e-id.to</Address>
          <Address href="https://eid.to">eid.to</Address>
          <Address href="https://👤.to">
            <EmojiDomain />
          </Address>
        </ul>
        <p>
          If you have issues setting your emoji domain try using the punycode
          domain, like so:
        </p>
        <ul>
          <Address href="https://xn--mq8h.to/adriangalilea">
            https://xn--mq8h.to/adriangalilea
          </Address>
        </ul>
      </>
    ),
  },
  {
    q: "Where is the code?",
    a: (
      <p>
        You can take a look at the code on{" "}
        <Link href="https://github.com/adriangalilea/e-id" className={LINK}>
          GitHub
          <ArrowUpRight
            strokeWidth={1.5}
            aria-hidden
            className="ml-0.5 inline size-4 align-[-0.1em] opacity-50"
          />
        </Link>
      </p>
    ),
  },
];

export default function Faq() {
  return (
    <Wide className="gap-12 sm:gap-16">
      <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] font-medium tracking-[-0.04em]">
        Frequently Asked Questions
      </h1>
      <dl className="flex flex-col">
        {QUESTIONS.map(({ q, a }) => (
          <div
            key={q}
            className="grid gap-4 border-t border-white/10 py-8 sm:py-10 lg:grid-cols-[minmax(0,38.2fr)_minmax(0,61.8fr)] lg:gap-10"
          >
            <dt className="text-xl font-medium tracking-[-0.02em]">{q}</dt>
            <dd className="flex max-w-2xl flex-col gap-5 text-[17px] leading-relaxed font-light text-pretty text-foreground/75">
              {a}
            </dd>
          </div>
        ))}
      </dl>
    </Wide>
  );
}
