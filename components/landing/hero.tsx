import { EmojiDomain } from "@/components/brand";
import { NavActions } from "@/components/footer/footer";
import { GUTTER } from "@/components/frame";
import { IdCard, type Holder } from "@/components/id-card";
import { Glass } from "@/components/ui/material-glass";
import { cn } from "@/lib/utils";
import { MakeYours } from "./make-yours";

/** The card the landing hands its reader: theirs, not made yet. Its words are the
 *  page's own line, what an e-id is. */
const YOU: Holder = {
  name: "you",
  username: "you",
  image: null,
  country: "XX",
  bio: "one link for every place you are online.",
};

/** The landing's first screen: the address and the way in, beside the card it
 *  makes. On a phone it is the page's head, closed by a hairline the sign-ups start
 *  from. On a wide screen it IS the site's bar: fixed at the top, it closes into the
 *  glass pill as the page scrolls, "👤.to/you" travelling into the bar's wordmark
 *  (globals.css, `hero`); `hero-space` holds its place in the page meanwhile. The
 *  glass and the bar's right end are only drawn there. */
export function Hero() {
  return (
    <>
      <div data-slot="hero-space" aria-hidden className="hidden" />
      <section
        data-slot="hero"
        className="relative isolate border-b border-white/10"
      >
        <Glass
          data-slot="hero-glass"
          aria-hidden
          shape="surface"
          className="pointer-events-none absolute! inset-0 -z-10 hidden [--glass-radius:calc(var(--bar-h)/2)]"
        />
        <div
          data-slot="hero-grid"
          className={cn(
            "mx-auto grid w-full max-w-6xl items-center gap-16 pt-20 pb-20 sm:pt-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-32",
            GUTTER,
          )}
        >
          <div data-slot="hero-words" className="flex flex-col gap-12">
            <h1
              data-slot="hero-title"
              className="text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-medium tracking-[-0.045em]"
            >
              <span data-slot="hero-lead" className="block text-foreground/40">
                your page at
              </span>
              <span className="block whitespace-nowrap">
                <EmojiDomain />
                <span data-slot="hero-you" className="inline-block">
                  /you
                </span>
              </span>
            </h1>
            <div data-slot="hero-cta">
              <MakeYours />
            </div>
          </div>
          <div data-slot="hero-card" className="lg:[perspective:1600px]">
            <IdCard
              holder={YOU}
              heading="p"
              className="mx-auto w-full max-w-sm lg:[transform:rotateY(-16deg)_rotateX(6deg)]"
            />
          </div>
        </div>
        <div data-slot="hero-actions" className="hidden">
          <NavActions />
        </div>
      </section>
    </>
  );
}
