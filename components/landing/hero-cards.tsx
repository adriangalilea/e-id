"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { lazy, Suspense, use, useEffect, useRef, useState } from "react";
import { EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { type Holder, IdCard, NAME, type Place } from "@/components/id-card";
import { useChip } from "@/components/session/use-chip";
import { HoloLight } from "@/components/ui/holo";
import { useToast } from "@/components/ui/use-toast";
import {
  claimDraft,
  githubCard,
  type HandleState,
  handleState,
} from "@/db/actions";
import { type SocialPlatform, socialPlatforms } from "@/db/schema";
import type { Card } from "@/lib/card";
import { EMOJI_DOMAIN } from "@/lib/const";
import {
  clearDraft,
  type Draft,
  fill,
  readDraft,
  toHandle,
  useDraft,
  writeDraft,
} from "@/lib/draft";
import { startSignIn } from "@/lib/sign-in";
import { getSocialIcon } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** A field written on the card: no box, no line, the card's own type. What is
 *  not written yet shows faint in its place, as a blank form's printed labels. */
const FIELD =
  "min-w-0 bg-transparent outline-none placeholder:text-foreground/25 focus-visible:placeholder:text-foreground/15";

/** A field on the card is no login: password managers keep their buttons and
 *  suggestions out of it (1Password's sat over the name). Each reads its own
 *  attribute; `autocomplete` alone is ignored by most of them. */
const WRITTEN_HERE = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;

/** Solid: a card hides what is behind it, as a real one does. */
const SOLID = "[--id-card-thickness:1]";

/** A card's own corner (ID-1: 3.18 mm on 85.6 by 53.98), as shares of its box, so
 *  a shadow cast from the card's box is rounded as the card is at any size. */
const CORNER = "rounded-[3.715%/5.891%]";

/** The visitor's card lies above every other: its shadow falls wide and soft on
 *  the cards round it, darkest just under it. */
const FRONT = cn(
  SOLID,
  CORNER,
  "shadow-[0_2.5rem_5rem_-1rem_rgb(0_0_0/0.75),0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.55)]",
);

// ── the visitor's card ──────────────────────────────────────────────────────

/** THE VISITOR'S CARD, on the left of the home: their own once they have one;
 *  until then a blank e-id they fill in where it lies, and filling it in IS making
 *  the profile. No form round it and no button beside it: the name on the name's
 *  line, the handle after the address (checked as it is typed), the country
 *  picked on its flag, the places pressed onto it; with a free handle the address
 *  itself offers to claim it, and claiming signs in and makes the card the
 *  account's (`Claim`). It lies still: a card being written on does not move. The
 *  page is the same for everyone, so whose it is is known only in the browser
 *  (`useChip`), blank until then. */
export function YourCard() {
  const chip = useChip();
  return (
    <HoloLight className="w-full">
      <Claim />
      {chip?.u ? (
        <Suspense
          fallback={
            <IdCard
              heading="p"
              holo="laminate"
              className={FRONT}
              holder={{
                name: null,
                username: chip.u,
                image: chip.i,
                country: "XX",
                bio: null,
              }}
            />
          }
        >
          <OwnCard username={chip.u} />
        </Suspense>
      ) : (
        <FillCard />
      )}
    </HoloLight>
  );
}

function FillCard() {
  const draft = useDraft();
  const handle = useHandleState(draft.handle);
  const claim = () => {
    writeDraft({ claiming: true });
    startSignIn();
  };
  return (
    <IdCard
      heading="p"
      holo="laminate"
      // Its print and rim a third of a card's: there, but never in the way of
      // the writing.
      quiet
      className={FRONT}
      holder={{
        name: draft.name,
        username: draft.handle || "you",
        image: draft.image,
        country: draft.country,
        bio: null,
      }}
      slots={{
        name: (
          <input
            aria-label="your name"
            placeholder="your name"
            {...WRITTEN_HERE}
            spellCheck={false}
            value={draft.name}
            onChange={(e) => writeDraft({ name: e.target.value })}
            // The name's tight leading (1.02, for two set lines) is shorter than
            // its glyphs, and a field that short scrolls its own text: room for
            // them, the line kept where it was by as much margin.
            className={cn(NAME, FIELD, "-my-[0.14em] w-full leading-[1.3]")}
          />
        ),
        address: <Address draft={draft} handle={handle} onClaim={claim} />,
        country: <Country code={draft.country} />,
        flair: <Places places={draft.places} />,
      }}
    />
  );
}

/** What the server says of a handle, for the handle it was asked about: a
 *  moment after the typing stops, and never an answer about an older one.
 *  Asked at the same time, GitHub's public profile for the same login (the
 *  handle IS the GitHub login at sign-up): when there is one, the card fills
 *  itself with it on the spot (photo, name, country, places: lib/draft, `fill`),
 *  and a handle that is nobody's on GitHub takes the last fill back off. */
function useHandleState(handle: string) {
  const [answer, setAnswer] = useState<{
    handle: string;
    state: HandleState;
    why: string | null;
  } | null>(null);
  useEffect(() => {
    if (!handle) {
      if (readDraft().auto) writeDraft(fill(readDraft(), null));
      return;
    }
    let live = true;
    const wait = setTimeout(() => {
      void handleState(handle).then((a) => {
        if (live) setAnswer({ handle, ...a });
      });
      void githubCard(handle).then((found) => {
        const now = readDraft();
        if (!live || now.handle !== handle) return;
        if (!found && !now.auto) return;
        writeDraft(
          fill(
            now,
            found && {
              login: handle,
              name: found.name,
              country: found.country,
              image: found.image,
              places: found.website ? ["github", "website"] : ["github"],
            },
          ),
        );
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [handle]);
  return answer?.handle === handle ? answer : null;
}

/** The address as the card writes it, the handle typed after its slash, as wide
 *  as what is typed (a monospace field is that many characters). After it, what
 *  the handle is: faint while it is no username yet, "taken", or free, and then
 *  the way to claim it, there in the line (Enter does the same). */
function Address({
  draft,
  handle,
  onClaim,
}: {
  draft: Draft;
  handle: ReturnType<typeof useHandleState>;
  onClaim: () => void;
}) {
  const free = handle?.state === "free";
  return (
    <div className="flex min-w-0 items-center gap-[1.6cqw] self-start font-mono text-[3cqw] text-foreground/50">
      <label className="flex min-w-0 items-center">
        <EmojiDomain path="/" className="shrink-0" />
        <input
          aria-label="your username"
          aria-describedby="handle-state"
          placeholder="you"
          {...WRITTEN_HERE}
          autoCapitalize="none"
          spellCheck={false}
          size={Math.max(draft.handle.length, 3)}
          value={draft.handle}
          onChange={(e) => writeDraft({ handle: toHandle(e.target.value) })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && free) onClaim();
          }}
          className={cn(
            FIELD,
            free || handle?.state === "taken"
              ? "text-foreground/85"
              : "text-foreground/40",
          )}
        />
      </label>
      <span id="handle-state" aria-live="polite" className="shrink-0">
        {free ? (
          <button
            type="button"
            onClick={onClaim}
            className="-my-[0.6cqw] rounded-[1cqw] px-[1.2cqw] py-[0.6cqw] text-foreground/70 transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            claim ↵
          </button>
        ) : handle?.state === "taken" ? (
          <span className="text-foreground/35">taken</span>
        ) : handle?.state === "invalid" && draft.handle ? (
          <span className="sr-only">{handle.why}</span>
        ) : null}
      </span>
    </div>
  );
}

/** Every country's flag weighs about 45 KB: the picker (@ag/country-picker) is
 *  loaded once a hand or focus comes to the flag, before it is pressed. */
const CountryPickerPopover = lazy(() =>
  import("@/components/ui/country-picker").then((m) => ({
    default: m.CountryPickerPopover,
  })),
);

/** The country on the card's head, its flag the picker's trigger. "XX" is none. */
function Country({ code }: { code: string }) {
  const [near, setNear] = useState(false);
  const flag = (
    <button
      type="button"
      aria-label={code === "XX" ? "your country" : `your country, ${code}`}
      onPointerEnter={() => setNear(true)}
      onFocus={() => setNear(true)}
      className="-m-[1cqw] flex cursor-pointer items-center gap-[1.5cqw] rounded-[1cqw] p-[1cqw] font-mono transition-colors hover:bg-white/[0.08]"
    >
      {code === "XX" ? "" : code}
      <CountryFlag country={code} className="text-[4cqw]" />
    </button>
  );
  if (!near) return flag;
  return (
    <Suspense fallback={flag}>
      <CountryPickerPopover
        value={code === "XX" ? undefined : code}
        onChange={(picked) => writeDraft({ country: picked ?? "XX" })}
        none="none"
        align="end"
      >
        {flag}
      </CountryPickerPopover>
    </Suspense>
  );
}

/** The places as the card shows them (id-card, `Flair`), each one a press: a place
 *  on the card takes it off; the "+" lays the ones not on it under the row,
 *  faint, and pressing one puts it on. */
function Places({ places }: { places: SocialPlatform[] }) {
  const [open, setOpen] = useState(false);
  const rest = socialPlatforms.filter((p) => !places.includes(p));
  const mark =
    "rounded-[1.2cqw] p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground";
  return (
    <div
      role="group"
      aria-label="places"
      className="relative -mx-[1.1cqw] flex flex-wrap items-center gap-[0.6cqw] text-foreground/70 [&_svg]:size-[4.6cqw] [&_svg]:stroke-[1.4]"
    >
      {places.map((platform) => (
        <button
          key={platform}
          type="button"
          aria-label={`remove ${platform}`}
          onClick={() =>
            writeDraft({ places: places.filter((p) => p !== platform) })
          }
          className={mark}
        >
          {getSocialIcon(platform)}
        </button>
      ))}
      {rest.length > 0 && (
        <button
          type="button"
          aria-label="add a place"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn(
            mark,
            "text-foreground/35 [&_svg]:transition-transform aria-expanded:[&_svg]:rotate-45",
          )}
        >
          <Plus />
        </button>
      )}
      {/* Laid under the row, not in it: the card's writing stays where it is
          while the choice is open. */}
      {open && (
        <div className="absolute top-full right-0 left-0 flex flex-wrap gap-[0.6cqw]">
          {rest.map((platform) => (
            <button
              key={platform}
              type="button"
              aria-label={`add ${platform}`}
              onClick={() => writeDraft({ places: [...places, platform] })}
              className={cn(mark, "text-foreground/25")}
            >
              {getSocialIcon(platform)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The card becomes the account's: when the sign-in the address started comes
 *  back signed in, what was written is claimed (`claimDraft`) and the edit page
 *  opens, where the places pressed onto the card wait for their usernames.
 *  Claiming until the server answers, so a lost call is tried again on the next
 *  load; sent once per mount (`sent`), so a second render never claims twice. With
 *  no username to give (the drafted one and the provider's both refused), the
 *  draft stays for /null to start from. */
function Claim() {
  const chip = useChip();
  const draft = useDraft();
  const router = useRouter();
  const { toast } = useToast();
  const sent = useRef(false);
  useEffect(() => {
    if (!chip || !draft.claiming || sent.current) return;
    sent.current = true;
    const { name, handle, country, places } = draft;
    const written = { name, handle, country, places };
    claimDraft(written).then(
      ({ username, stale, refused }) => {
        if (refused)
          toast({
            variant: "destructive",
            title: `${EMOJI_DOMAIN}/${written.handle}`,
            description: refused,
          });
        if (!username) {
          writeDraft({ claiming: false });
          return router.push("/null");
        }
        clearDraft();
        if (!stale) router.push(`/${username}/edit`);
      },
      // Still claiming: the next load tries again.
      (error) => {
        sent.current = false;
        throw error;
      },
    );
  }, [chip, draft, router, toast]);
  return null;
}

/** Each person's card read once per page (`/<username>/card.json`), kept so a
 *  render suspends on the same promise. */
const cards = new Map<string, Promise<Holder>>();

function cardHolder(username: string): Promise<Holder> {
  let holder = cards.get(username);
  if (!holder) {
    holder = fetch(`/${username}/card.json`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`card of ${username}: HTTP ${response.status}`);
        return response.json() as Promise<Card>;
      })
      .then((card) => ({
        name: card.name,
        username: card.handle,
        image: card.photo,
        country: card.country ?? "XX",
        bio: card.bio,
        places: card.places as Place[],
      }));
    cards.set(username, holder);
  }
  return holder;
}

function OwnCard({ username }: { username: string }) {
  return (
    <IdCard
      heading="p"
      holo="laminate"
      className={FRONT}
      holder={use(cardHolder(username))}
    />
  );
}

// ── the stage ───────────────────────────────────────────────────────────────

/** Where the real cards lie round the visitor's, in the stage's 3D: across in cqw
 *  of the stage from its centre, up and down in rem, back in px (all behind the
 *  visitor's card, which lies at 0), each turned a little, as cards dealt on a
 *  table, never twisted toward a vanishing point. Three each side, one near, one
 *  far, one low, so the spread reads as depth, not a row. `float` is how long one
 *  slow rise takes, each its own so no two move in step. */
const AROUND = [
  { x: -34, y: -10, z: -220, ry: 10, rx: 3, rz: -6, float: 9 },
  { x: -48, y: 3, z: -420, ry: 12, rx: 0, rz: 4, float: 11 },
  { x: -34, y: 12, z: -160, ry: 8, rx: -3, rz: 3, float: 8 },
  { x: 34, y: -11, z: -200, ry: -10, rx: 3, rz: 5, float: 10 },
  { x: 49, y: 2, z: -400, ry: -12, rx: 0, rz: -3, float: 12 },
  { x: 33, y: 12, z: -260, ry: -8, rx: -3, rz: -4, float: 9.5 },
] as const;

/** The stage's perspective, in px: how far the eye stands from the visitor's
 *  card. */
const EYE = 1600;

/** A card's width at the front, before its depth. */
const CARD_REM = 20;

/** One card's place, and how dim it is there. Its depth is drawn, not moved
 *  into: the card is given the width and place it has at that depth (seen from
 *  `EYE`, a card `z` back is EYE / (EYE − z) its size and as near the middle), so
 *  the browser paints it at the size it is seen. Pushed back with translateZ it
 *  was painted at the front size and shrunk as a picture, and while it drifted it
 *  was never painted again: soft, jagged words and edges. Dimmer the further
 *  back, as if the light were on the visitor's card (by brightness, never
 *  opacity: a see-through card shows the shimmer through it). */
function placed({ x, y, z, ry, rx, rz }: (typeof AROUND)[number]) {
  const seen = EYE / (EYE - z);
  return {
    width: `${(CARD_REM * seen).toFixed(2)}rem`,
    transform: `translate(-50%, -50%) translate(${(x * seen).toFixed(2)}cqw, ${(y * seen).toFixed(2)}rem) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`,
    "--dim": (0.82 + z / 1400).toFixed(2),
  } as React.CSSProperties;
}

/** A real card under the hand: lifted a little (up, never scaled: a scaled card
 *  is a stretched picture of itself), in full light, and tilted toward
 *  the hand, its near edge going down where the hand presses (±9° across, ±7°
 *  up and down: `HoloLean`'s flat pose, ±3°, read as no tilt at this size).
 *  Its shadow on the table under it is close and small at rest, and falls longer
 *  and softer as it lifts. Eased both ways, so it follows with a little weight
 *  and settles flat when the hand leaves. */
const PICKED = cn(
  CORNER,
  "brightness-(--dim) shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.6)] transition-[filter,transform,box-shadow] duration-300 ease-out",
  "group-data-[hover]/holo:brightness-100 group-data-[hover]/holo:shadow-[0_2rem_3.5rem_-0.75rem_rgb(0_0_0/0.7)] group-data-[hover]/holo:[transform:perspective(1200px)_translateY(-0.5rem)_rotateY(calc((var(--px,0.5)-0.5)*18deg))_rotateX(calc((var(--py,0.5)-0.5)*-14deg))]",
  "motion-reduce:transition-none motion-reduce:group-data-[hover]/holo:[transform:none]",
);

/** THE HERO'S STAGE: the visitor's card in the middle, still, and real ones
 *  spread round it in depth (`AROUND`), the maker's and the newest whole ones (a
 *  photo, a name, a country), the visitor's own left out: what a filled one is,
 *  shown rather than told. Each drifts on its own, slowly, and answers the hand
 *  only when the hand is on it, leaning to it with its hologram showing, as a
 *  card picked up would (its own HoloLight); nothing follows the hand across the
 *  hero. The visitor's card does neither: a card being written on lies still.
 *  Under reduced motion nothing moves. On one column, their card alone. */
export function Stage({
  people,
  children,
}: {
  people: Holder[];
  /** what stands in the middle: the visitor's card and its light */
  children: React.ReactNode;
}) {
  const own = useChip()?.u;
  const around = people
    .filter((holder) => holder.username !== own)
    .slice(0, AROUND.length);
  return (
    <div className="@container relative grid w-full place-items-center [perspective:1600px] lg:h-[40rem]">
      {around.map((holder, i) => {
        const at = AROUND[i] as (typeof AROUND)[number];
        return (
          <div
            key={holder.username}
            className="absolute top-1/2 left-1/2 max-lg:hidden"
            style={placed(at)}
          >
            <div
              className="animate-[card-float_ease-in-out_infinite_alternate] motion-reduce:animate-none"
              style={{
                animationDuration: `${at.float}s`,
                animationDelay: `-${(at.float * i) / AROUND.length}s`,
              }}
            >
              <HoloLight>
                <div className={PICKED}>
                  <IdCard
                    holder={holder}
                    heading="p"
                    holo="laminate"
                    className={SOLID}
                  />
                </div>
              </HoloLight>
            </div>
          </div>
        );
      })}
      <div className="relative z-10 w-full max-w-[36rem]">{children}</div>
    </div>
  );
}
