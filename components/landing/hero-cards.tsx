"use client";

import { ArrowLeft, CornerDownLeft, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { lazy, Suspense, use, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { type Holder, IdCard, NAME, type Place } from "@/components/id-card";
import { useChip } from "@/components/session/use-chip";
import { SocialComponent } from "@/components/social_component";
import { Button } from "@/components/ui/button";
import { HoloLight } from "@/components/ui/holo";
import { InputGroup } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import {
  claimDraft,
  githubCard,
  type HandleState,
  handleState,
  previewPresence,
} from "@/db/actions";
import { type SocialPlatform, socialPlatforms } from "@/db/schema";
import type { Card } from "@/lib/card";
import { EMOJI_DOMAIN } from "@/lib/const";
import {
  asSocials,
  type Draft,
  fill,
  filledPlaces,
  isBlank,
  type Place as DraftPlace,
  toHandle,
} from "@/lib/card-draft";
import { clearDraft, readDraft, useDraft, writeDraft } from "@/lib/draft";
import type { Presence } from "@/lib/presence";
import { startSignIn } from "@/lib/sign-in";
import {
  getSocialIcon,
  getSocialPlaceholder,
  getSocialUrl,
} from "@/lib/socials";
import { cn } from "@/lib/utils";

/** A field written on the card: no box, no line, the card's own type. What is
 *  not written yet shows faint in its place, as a blank form's printed labels. */
const FIELD =
  "min-w-0 bg-transparent outline-none placeholder:text-foreground/30 focus-visible:placeholder:text-foreground/20";

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

/** Whether the visitor's card has started becoming a profile: a place on it says
 *  where, so there is a profile to show. The stage gives way to it then. */
function useForming(): boolean {
  const chip = useChip();
  const draft = useDraft();
  return !chip?.u && filledPlaces(draft).length > 0;
}

// ── the visitor's card ──────────────────────────────────────────────────────

/** THE VISITOR'S CARD, in the middle of the home: their own once they have one;
 *  until then a blank e-id they fill in where it lies, and filling it in IS making
 *  the profile. No form round it: the name on the name's line, the handle after
 *  the address (checked as it is typed), the country picked on its flag, the
 *  places added under them, each asking for the username there. The GitHub one
 *  fills the rest from GitHub (photo, name, country, website), and as places are
 *  added the page under the card becomes the profile they make (`Preview`). With
 *  a free handle the address offers to claim it; claiming signs in and the card
 *  becomes the account's (`Claim`). It lies still: a card being written on does
 *  not move. The page is the same for everyone, so whose it is is known only in
 *  the browser (`useChip`), blank until then. */
export function YourCard() {
  const chip = useChip();
  const draft = useDraft();
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
        <>
          <FillCard />
          {/* Room kept whether it shows or not: the card never moves. */}
          <div className="mt-3 flex h-6 justify-end">
            {!isBlank(draft) && (
              <button
                type="button"
                onClick={() => shape(false, clearDraft)}
                className="font-mono text-[11px] text-foreground/40 transition-colors hover:text-foreground/80"
              >
                start over
              </button>
            )}
          </div>
        </>
      )}
    </HoloLight>
  );
}

function FillCard() {
  const draft = useDraft();
  const handle = useHandleState(draft.handle);
  useGithubFill(
    draft.places.find((p) => p.platform === "github")?.value.trim() || null,
  );
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
 *  moment after the typing stops, and never an answer about an older one. */
function useHandleState(handle: string) {
  const [answer, setAnswer] = useState<{
    handle: string;
    state: HandleState;
    why: string | null;
  } | null>(null);
  useEffect(() => {
    if (!handle) return;
    let live = true;
    const wait = setTimeout(() => {
      void handleState(handle).then((a) => {
        if (live) setAnswer({ handle, ...a });
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [handle]);
  return answer?.handle === handle ? answer : null;
}

/** The card fills itself from the visitor's GitHub once they give it (their
 *  GitHub place): photo, name, handle, country, website, each only where they
 *  wrote nothing (lib/draft, `fill`). Another login replaces that fill; none, or
 *  one GitHub does not know, takes it back off. */
function useGithubFill(login: string | null) {
  useEffect(() => {
    const now = readDraft();
    if (!login) {
      if (now.auto) writeDraft(fill(now, null));
      return;
    }
    if (now.auto?.login.toLowerCase() === login.toLowerCase()) return;
    let live = true;
    const wait = setTimeout(() => {
      void githubCard(login).then((found) => {
        if (!live) return;
        writeDraft(
          fill(
            readDraft(),
            found && {
              login: found.login,
              name: found.name,
              handle: toHandle(found.login),
              country: found.country,
              image: found.image,
              places: found.website
                ? [{ platform: "website", value: found.website }]
                : [],
            },
          ),
        );
      });
    }, 300);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [login]);
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
    <div className="flex min-w-0 items-center gap-[1.6cqw] self-start font-mono text-[3cqw] text-foreground/60">
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
            "leading-normal",
            free || handle?.state === "taken"
              ? "text-foreground/90"
              : "text-foreground/45",
          )}
        />
      </label>
      <span id="handle-state" aria-live="polite" className="shrink-0">
        {free ? (
          <button
            type="button"
            onClick={onClaim}
            className="-my-[0.6cqw] rounded-[1cqw] px-[1.2cqw] py-[0.6cqw] text-foreground/80 transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            claim ↵
          </button>
        ) : handle?.state === "taken" ? (
          <span className="text-foreground/45">taken</span>
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

/** What comes before a username on a platform, as its address is written
 *  ("github.com/", "youtube.com/@"), from the one place that builds the address
 *  (lib/socials); nothing for what is written whole (an email, a website). */
function prefixOf(platform: SocialPlatform): string {
  const address = getSocialUrl(platform, "").replace(
    /^(https?:\/\/|mailto:)/,
    "",
  );
  return /[/@]$/.test(address) ? address : "";
}

/** A pasted address read as the username it ends in, where the platform takes a
 *  username ("https://github.com/adrian" on github is "adrian"). */
function valueOf(platform: SocialPlatform, typed: string): string {
  const prefix = prefixOf(platform);
  const trimmed = typed.trim();
  if (!prefix) return trimmed;
  const bare = trimmed.replace(/^https?:\/\/(www\.)?/, "");
  return bare.startsWith(prefix) ? bare.slice(prefix.length) : trimmed;
}

/** The card's places (id-card, `Flair`): each a press that opens it to change or
 *  take off, and "+" to add one, in a popover (@ag/popover): the platforms by
 *  name, then the username there. */
function Places({ places }: { places: DraftPlace[] }) {
  const rest = socialPlatforms.filter(
    (p) => !places.some((place) => place.platform === p),
  );
  const mark =
    "rounded-[1.2cqw] p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground data-[popup-open]:bg-white/[0.08] data-[popup-open]:text-foreground";
  const save = (platform: SocialPlatform, value: string) => {
    const others = readDraft().places.filter((p) => p.platform !== platform);
    const next = value ? [...others, { platform, value }] : others;
    shape(
      next.some((p) => p.value.trim() !== ""),
      () => writeDraft({ places: next }),
    );
  };
  return (
    <div
      role="group"
      aria-label="places"
      className="-mx-[1.1cqw] flex flex-wrap items-center gap-[0.6cqw] text-foreground/75 [&_svg]:size-[4.6cqw] [&_svg]:stroke-[1.4]"
    >
      {places.map((place) => (
        <PlacePopover
          key={place.platform}
          trigger={
            <button
              type="button"
              aria-label={`${place.platform}: ${place.value}`}
              className={mark}
            >
              {getSocialIcon(place.platform)}
            </button>
          }
          platforms={[place.platform]}
          place={place}
          onSave={save}
        />
      ))}
      {rest.length > 0 && (
        <PlacePopover
          trigger={
            <button
              type="button"
              aria-label="add a place"
              className={cn(mark, "text-foreground/45")}
            >
              <Plus />
            </button>
          }
          platforms={rest}
          onSave={save}
        />
      )}
    </div>
  );
}

/** One place's popover: with several platforms to choose from, the list first
 *  (icon and name); then the field for the username there, the platform's
 *  address before it, Enter to keep. A place already on the card opens straight
 *  to its field, with the way to take it off. */
function PlacePopover({
  trigger,
  platforms,
  place,
  onSave,
}: {
  trigger: React.ReactElement;
  platforms: SocialPlatform[];
  place?: DraftPlace;
  onSave: (platform: SocialPlatform, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<SocialPlatform | null>(
    place?.platform ?? (platforms.length === 1 ? platforms[0] : null),
  );
  const [typed, setTyped] = useState(place?.value ?? "");
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setChosen(
            place?.platform ?? (platforms.length === 1 ? platforms[0] : null),
          );
          setTyped(place?.value ?? "");
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-80 gap-3 p-3">
        {!chosen ? (
          <div role="listbox" aria-label="add a place" className="flex flex-col">
            {platforms.map((platform) => (
              <button
                key={platform}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => setChosen(platform)}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground/85 transition-colors hover:bg-foreground/8 hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5]"
              >
                {getSocialIcon(platform)}
                {platform}
              </button>
            ))}
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(chosen, valueOf(chosen, typed));
              setOpen(false);
            }}
          >
            {/* The place named, and at its other end the one thing to do with
                it besides writing: back to the list while adding, × to take it
                off the card once it is on it. */}
            <div className="flex h-7 items-center gap-2 pl-1 text-sm text-foreground/85 [&_svg]:stroke-[1.5]">
              {!place && platforms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="other places"
                  onClick={() => setChosen(null)}
                  className="-ml-1.5 text-foreground/50"
                >
                  <ArrowLeft />
                </Button>
              )}
              <span className="[&_svg]:size-4">{getSocialIcon(chosen)}</span>
              {chosen}
              {place && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`remove ${chosen}`}
                  onClick={() => {
                    onSave(place.platform, "");
                    setOpen(false);
                  }}
                  className="ml-auto text-foreground/50"
                >
                  <X />
                </Button>
              )}
            </div>
            <InputGroup
              size="sm"
              autoFocus
              aria-label={`your ${chosen}`}
              placeholder={getSocialPlaceholder(chosen)}
              {...WRITTEN_HERE}
              spellCheck={false}
              autoCapitalize="none"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              start={
                prefixOf(chosen) ? (
                  <span className="font-mono text-xs text-foreground/50">
                    {prefixOf(chosen)}
                  </span>
                ) : undefined
              }
              end={<CornerDownLeft className="text-foreground/40" />}
            />
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The card becomes the account's: when the sign-in the address started comes
 *  back signed in, what was written is claimed (`claimDraft`) and the profile it
 *  made opens. Claiming until the server answers, so a lost call is tried again
 *  on the next load; sent once per mount (`sent`), so a second render never
 *  claims twice. With no username to give (the drafted one and the provider's
 *  both refused), the draft stays for /null to start from. */
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
        if (!stale) router.push(`/${username}`);
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

// ── the profile it becomes ──────────────────────────────────────────────────

/** THE PROFILE THE CARD MAKES, under it: once a place on the card says where, the
 *  page shows what the profile will (the same `SocialComponent` a profile draws,
 *  its GitHub calendar, its website's preview), read from those places as they
 *  are written (`previewPresence`), each answer faded in as it comes. Before an
 *  account exists, built in the browser and nowhere else. */
export function Preview() {
  const forming = useForming();
  const draft = useDraft();
  const places = filledPlaces(draft);
  const key = JSON.stringify(places);
  const [read, setRead] = useState<{ key: string; presence: Presence } | null>(
    null,
  );
  useEffect(() => {
    if (!forming) return;
    let live = true;
    const wait = setTimeout(() => {
      void previewPresence(JSON.parse(key)).then((presence) => {
        if (live) setRead({ key, presence });
      });
    }, 400);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [forming, key]);
  if (!forming || !read) return null;
  return (
    <div
      key={read.key}
      className="w-full animate-fade-in motion-reduce:animate-none"
    >
      <SocialComponent
        socials={asSocials(JSON.parse(read.key))}
        presence={read.presence}
      />
    </div>
  );
}

// ── the stage ───────────────────────────────────────────────────────────────

/** Where the real cards lie round the visitor's, composed rather than mirrored:
 *  each card's centre across in cqw of the stage and up or down in rem from the
 *  stage's centre, its width in rem, its turn on the table in degrees. Two large
 *  ones on the diagonal (upper left, lower right) carry the weight; two peek out
 *  from behind the visitor's card, one over its top edge and one under its foot,
 *  so no side of it is bare; two small ones far out (right and high, left and
 *  low) are the accents. The visitor's card is 42rem by 26.5, so ±31cqw by
 *  ±13.2rem round the centre. `float` is how long one slow rise takes, each its
 *  own so no two move in step. */
const AROUND = [
  { x: -41, y: -9, w: 27, rz: -7, float: 9 },
  { x: 15, y: -18, w: 20, rz: 4, float: 11 },
  { x: 55, y: -5, w: 19, rz: 9, float: 10 },
  { x: 39, y: 11, w: 26, rz: -4, float: 9.5 },
  { x: -14, y: 18.5, w: 23, rz: -3, float: 8 },
  { x: -56, y: 10, w: 18, rz: 6, float: 12 },
] as const;

/** The smallest and the largest card's widths, between which a card reads from
 *  far back to near. */
const SMALL = 18;
const LARGE = 27;

/** One card's place, and how it shows its depth. Its size is its own (`w`), so
 *  the browser paints it at the size it is seen: pushed back with translateZ a
 *  card was painted at the front size and shrunk as a picture, and while it
 *  drifted it was never painted again (soft, jagged words and edges). A smaller
 *  card reads as further back: dimmer (by brightness, never opacity: a
 *  see-through card shows the shimmer through it) and turned a little less
 *  toward the middle. Once the card becomes a profile, each slides away from the
 *  middle the way it lies and fades. */
function placed({ x, y, w, rz }: (typeof AROUND)[number]) {
  const near = (w - SMALL) / (LARGE - SMALL);
  return {
    width: `${w}rem`,
    transform: `translate(-50%, -50%) translate(${x}cqw, ${y}rem) rotateY(${(-Math.sign(x) * (4 + 6 * near)).toFixed(1)}deg) rotateZ(${rz}deg)`,
    "--dim": (0.45 + 0.37 * near).toFixed(2),
  } as React.CSSProperties;
}

/** A real card under the hand: lifted a little (up, never scaled: a scaled card
 *  is a stretched picture of itself), in full light, and tilted toward the hand,
 *  its near edge going down where the hand presses (±9° across, ±7° up and down:
 *  `HoloLean`'s flat pose, ±3°, read as no tilt at this size). Its shadow on the
 *  table under it is close and small at rest, and falls longer and softer as it
 *  lifts. Eased both ways, so it follows with a little weight and settles flat
 *  when the hand leaves. */
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
 *  Once it starts becoming a profile the stage IS the profile page's layout (the
 *  golden split, app/[username]/user_profile): the card held in the left column,
 *  the places it makes on the right (`Preview`), the others gone. The card moves
 *  there as one thing (a view transition, `shape`), never a jump. Under reduced
 *  motion nothing moves. On one column, their card alone. */
export function Stage({
  people,
  preview,
  children,
}: {
  people: Holder[];
  /** the profile the card makes, beside it once it forms */
  preview: React.ReactNode;
  /** what stands in the middle: the visitor's card and its light */
  children: React.ReactNode;
}) {
  const own = useChip()?.u;
  const forming = useForming();
  const around = people
    .filter((holder) => holder.username !== own)
    .slice(0, AROUND.length);
  return (
    <div
      className={cn(
        "relative grid w-full",
        forming
          ? "items-start gap-10 lg:grid-cols-[minmax(0,38.2fr)_minmax(0,61.8fr)] lg:py-6"
          : "@container place-items-center [perspective:1600px] lg:h-[50rem]",
      )}
    >
      {!forming &&
        around.map((holder, i) => {
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
      {/* One element in both layouts, so the card is never remounted; named, so
          the view transition carries it from the middle to its column. */}
      <div
        className={cn(
          "relative z-10 w-full [view-transition-name:your-card]",
          forming ? "lg:sticky lg:top-24 lg:self-start" : "max-w-[42rem]",
        )}
      >
        {children}
      </div>
      {forming && <div className="min-w-0">{preview}</div>}
    </div>
  );
}

/** A change to the card that may turn it into a profile or back (`forming`
 *  after it): when it does, made inside a view transition, so the browser
 *  carries the card from the middle to its column (or back) and fades the rest
 *  across; React draws the change inside it (`flushSync`). Otherwise, and under
 *  reduced motion or where there are no view transitions, just made. */
function shape(forming: boolean, change: () => void) {
  const was = filledPlaces(readDraft()).length > 0;
  if (
    was === forming ||
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return change();
  document.startViewTransition(() => flushSync(change));
}
