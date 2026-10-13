import { EmojiDomain } from "@/components/brand";
import { NavActions } from "@/components/footer/footer";
import { GUTTER } from "@/components/frame";
import { IdCard, type Holder } from "@/components/id-card";
import { HeroShown } from "@/components/presence";
import { Glass } from "@/components/ui/material-glass";
import { getShowcase } from "@/lib/data";
import { cn } from "@/lib/utils";
import { MakeYours } from "./make-yours";
import { Tilt } from "./tilt";

/** The card the landing hands its reader when there is nobody yet to show: theirs,
 *  not made yet. */
const YOU: Holder = {
  name: "you",
  username: "you",
  image: null,
  country: "XX",
  bio: null,
};

/** Where the cards behind the front one lie: turned out from under it, smaller
 *  and dimmer with depth, so the stack reads as real cards dealt on the page. With
 *  a hand on the stack they spread a little further, as cards do when touched. */
const BEHIND = [
  "-rotate-[8deg] -translate-x-[9%] translate-y-[7%] scale-[0.93] opacity-60 group-data-hover/tilt:-rotate-[11deg] group-data-hover/tilt:-translate-x-[14%] group-data-hover/tilt:translate-y-[9%]",
  "rotate-[7deg] translate-x-[10%] -translate-y-[8%] scale-[0.88] opacity-35 group-data-hover/tilt:rotate-[10deg] group-data-hover/tilt:translate-x-[15%] group-data-hover/tilt:-translate-y-[11%]",
];

/** Real e-id cards, the maker's first and then the newest whole ones (a photo, a
 *  name, a country), fanned: the front one under the light, turned toward the
 *  reader and following the hand, its hologram showing as it turns; the others
 *  dealt out behind. What a card is, shown, rather than an empty one. */
function Stack({ people }: { people: Holder[] }) {
  const [front = YOU, ...behind] = people;
  return (
    <Tilt className="relative mx-auto w-full max-w-sm lg:[perspective:1600px]">
      {behind.map((holder, i) => (
        <IdCard
          key={holder.username}
          holder={holder}
          heading="p"
          className={cn(
            "absolute inset-0 transition-[rotate,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            BEHIND[i],
          )}
        />
      ))}
      {/* Lying on the others, it hides them as a real card would: its body
          solid (a backdrop's blur does not reach through the card's 3D turn, so
          only opacity hides what is under it), its rim and light still glass's. */}
      <div data-slot="tilt-front" className="relative">
        <IdCard
          holder={front}
          heading="p"
          holo="laminate"
          className="[--id-card-thickness:1]"
        />
      </div>
    </Tilt>
  );
}

/** The landing's first screen: what an e-id is, in one address and one line, the
 *  way in, and real cards beside them. On a phone it is the page's head, closed by
 *  a hairline the sign-ups start from. On a wide screen it IS the site's bar: fixed
 *  at the top, it closes into the glass pill as the page scrolls, "👤.to/you"
 *  travelling into the bar's wordmark (globals.css, `hero`); `hero-space` holds
 *  its place in the page meanwhile. The glass and the bar's right end are only
 *  drawn there. */
export async function Hero() {
  const people = (await getShowcase()).map(
    (p): Holder => ({
      name: p.name,
      username: p.username,
      image: p.image,
      country: p.country_code,
      bio: p.bio,
      places: p.places,
    }),
  );
  return (
    <>
      <HeroShown />
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
            "mx-auto grid w-full max-w-6xl items-center gap-16 pt-16 pb-20 sm:pt-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-28",
            GUTTER,
          )}
        >
          <div data-slot="hero-words" className="flex flex-col gap-10">
            <div className="flex flex-col gap-5">
              <h1
                data-slot="hero-title"
                className="text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.95] font-medium tracking-[-0.045em] whitespace-nowrap"
              >
                <EmojiDomain />
                <span data-slot="hero-you" className="inline-block">
                  /you
                </span>
              </h1>
              <p
                data-slot="hero-lead"
                className="max-w-md text-xl leading-snug text-pretty text-foreground/65 sm:text-2xl"
              >
                one link for every place you are online.
              </p>
            </div>
            <div data-slot="hero-cta">
              <MakeYours />
            </div>
          </div>
          <div data-slot="hero-card">
            <Stack people={people} />
          </div>
        </div>
        <div data-slot="hero-actions" className="hidden">
          <NavActions />
        </div>
      </section>
    </>
  );
}
