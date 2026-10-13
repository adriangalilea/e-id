"use client";

import { ArrowLeft, CornerDownLeft, Plus, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { type Holder, IdCard, type Place } from "@/components/id-card";
import { ON_CARD } from "@/components/card-shape";
import { PROFILE } from "@/components/profile-layout";
import { useChip } from "@/components/session/use-chip";
import { SocialComponent } from "@/components/social_component";
import { Button } from "@/components/ui/button";
import { HoloLean, HoloLight } from "@/components/ui/holo";
import { LazyCountryPickerPopover } from "@/components/ui/country-picker-lazy";
import { Input, InputGroup } from "@/components/ui/input";
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

/** The registry's field (@ag/input, plain) at the card's size, worn as the card's
 *  own writing: at rest no well at all, only the words, or the label of what goes
 *  there in the card's own type (a blank card reads as a card, not a form). The
 *  well comes under the hand, while typing in it, and red when it is wrong, all
 *  the field's own. Its height in em of its text, its corner every corner on the
 *  card's (`ON_CARD`); its padding stays and is taken back outside, so the words
 *  stand in line with the rest of the card's and never move as the well comes. */
const WELL_ON_CARD = cn(
  ON_CARD,
  "-mx-[0.3em] h-[1.5em] px-[0.3em] [&_input]:placeholder:text-foreground/60",
  // In the card's language, not a form's: no outline. Where it is written in,
  // the card clears its print, as an ID's print falls back round the holder's
  // data (id-card, `KNOCKOUT`): a patch of the card's own dark, feathered at its
  // edge, faint under the hand and full while typing. Only wrong does it wear
  // a rim, the field's own red.
  "bg-transparent ring-transparent shadow-none transition-[background-color,box-shadow] hover:ring-transparent has-[input:focus-visible]:ring-transparent",
  "hover:bg-[rgb(14_14_16/0.7)] hover:shadow-[0_0_0.35em_0.2em_rgb(14_14_16/0.7)]",
  "has-[input:focus-visible]:bg-[rgb(14_14_16/0.92)] has-[input:focus-visible]:shadow-[0_0_0.35em_0.2em_rgb(14_14_16/0.92)]",
);

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

/** The visitor's card lies above every other: close under it a contact shadow;
 *  the wide soft one it casts on the cards round it is dithered, apart
 *  (components/light, `CastShadow`), where a box shadow that wide banded. */
const FRONT = cn(
  SOLID,
  CORNER,
  "shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.6)]",
);

/** The light drifting across the visitor's card while no hand is on it: the
 *  place it falls (`--px`, which the card's hologram and foil rim read) swept
 *  slowly one way and back (globals.css, `holo-idle`), inside the lean, so the
 *  light moves and the card does not. The hand takes it over the moment it
 *  comes (HoloLight's own `--px`); under reduced motion it rests. */
const IDLE =
  "animate-[holo-idle_6s_ease-in-out_infinite_alternate] group-data-[hover]/holo:animate-none motion-reduce:animate-none";

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
    // At rest its foil rim shows a band, not a faint whole ring, and the light
    // drifting across it (`IDLE`) moves that band: what draws the eye to the
    // card before the hand comes.
    <HoloLight className="w-full [&:not([data-hover])_[data-slot=foil-edge]]:opacity-45 [&:not([data-hover])_[data-slot=foil-edge]]:[--edge-floor:0.12]">
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
          <HoloLean pose="flat" className="max-lg:[transform:none]">
            <div className={IDLE}>
              <OwnCard username={chip.u} />
            </div>
          </HoloLean>
        </Suspense>
      ) : (
        <>
          {/* Leaning to the hand as a profile's card does (user_profile), by
              no more than a few degrees: alive, and still to write on. */}
          <HoloLean pose="flat" className="max-lg:[transform:none]">
            <div className={IDLE}>
              <FillCard />
            </div>
          </HoloLean>
          {/* Room kept whether it shows or not: the card never moves. */}
          <div className="mt-4 flex h-9 justify-end">
            {!isBlank(draft) && (
              // The page's own button (@ag/button, in its glass): read over any
              // card that lies under it, named by its glyph and its words.
              <Button
                type="button"
                size="sm"
                onClick={() => shape(false, clearDraft)}
                className="animate-fade-in motion-reduce:animate-none"
              >
                <RotateCcw /> start over
              </Button>
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
  // A blank card waits with the caret on its name, blinking, so the first thing
  // one sees it do is ask to be written on. Where there is a fine pointer only:
  // on a phone it would raise the keyboard over the page unasked.
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isBlank(readDraft()) && matchMedia("(pointer: fine)").matches)
      name.current?.focus({ preventScroll: true });
  }, []);
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
          <Input
            ref={name}
            aria-label="your name"
            placeholder="your name"
            {...WRITTEN_HERE}
            spellCheck={false}
            value={draft.name}
            onChange={(e) => writeDraft({ name: e.target.value })}
            // The registry's field (@ag/input) at the name's size: the well
            // round it says it is to be written in.
            material="plain"
            className={cn(
              WELL_ON_CARD,
              // The written name's size (id-card, `NAME`), across its row: sized
              // to the row, never to what is typed (the page sizes fields to
              // their content), so no letter of it is ever cut.
              "w-full text-[7cqw] font-medium tracking-[-0.03em] [&_input]:[field-sizing:fixed]",
            )}
          />
        ),
        // The address heads the card, where its mark and "e-id" stand on a
        // finished one: it is what the card is for, written first.
        head: <Address draft={draft} handle={handle} onClaim={claim} />,
        address: null,
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
  // Wrong while it cannot be theirs: taken, or no username at all yet (too
  // short, forbidden); the field's rim says so (@ag/input, `aria-invalid`).
  const wrong =
    draft.handle !== "" &&
    (handle?.state === "taken" || handle?.state === "invalid");
  return (
    // The field holds the address alone; what the address is (taken, or free and
    // the way to claim it) stands after it, on the same line, at its height.
    <div className="flex min-w-0 items-center gap-[0.5em] font-mono text-[3.2cqw]">
      <InputGroup
        aria-label="your username"
        aria-describedby="handle-state"
        aria-invalid={wrong}
        placeholder="you"
        {...WRITTEN_HERE}
        autoCapitalize="none"
        spellCheck={false}
        value={draft.handle}
        // As wide as the handle and one more character for the caret: a field
        // sized to its text alone scrolled it by a hair once the caret stood at
        // its end, and the first letter slid out of sight. Monospace, so a
        // character is exactly 1ch.
        style={{ width: `${Math.max(draft.handle.length, 3) + 1}ch` }}
        onChange={(e) => writeDraft({ handle: toHandle(e.target.value) })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && free) onClaim();
        }}
        // At the card's size (cqw), the address's own type: the well fits what
        // is written (the input sizes to its content), the domain before it.
        material="plain"
        className={cn(
          WELL_ON_CARD,
          "w-fit min-w-0 max-w-full text-[1em] [&_input]:flex-none [&_input]:[field-sizing:fixed] [&_svg]:h-[1cap] [&_svg]:w-auto",
        )}
        start={<EmojiDomain path="/" className="text-foreground/60" />}
      />
      <span id="handle-state" aria-live="polite" className="shrink-0">
        {free ? (
          <Button
            type="button"
            material="plain"
            variant="secondary"
            onClick={onClaim}
            className={cn(ON_CARD, "h-[1.5em] px-[0.5em] text-[1em]")}
          >
            claim ↵
          </Button>
        ) : handle?.state === "taken" ? (
          <span className="text-foreground/50">taken</span>
        ) : wrong ? (
          <span className="sr-only">{handle?.why}</span>
        ) : null}
      </span>
    </div>
  );
}

/** The country on the card's head, its flag the picker's trigger (the picker
 *  fetched as the card is drawn, off the page's first load, ready before it is
 *  pressed: @ag/country-picker, `LazyCountryPickerPopover`). Pressed while the
 *  picker is open, so the picker reads as come out of it. "XX" is none. */
function Country({ code }: { code: string }) {
  return (
    <LazyCountryPickerPopover
      value={code === "XX" ? undefined : code}
      onChange={(picked) => writeDraft({ country: picked ?? "XX" })}
      none="none"
      align="end"
    >
      <button
        type="button"
        aria-label={code === "XX" ? "your country" : `your country, ${code}`}
        className={cn(
          ON_CARD,
          "-m-[1cqw] flex cursor-pointer items-center gap-[1.5cqw] p-[1cqw] font-mono transition-colors hover:bg-white/[0.08] data-[popup-open]:bg-white/[0.12]",
        )}
      >
        {code === "XX" ? "" : code}
        <CountryFlag country={code} className="text-[4cqw]" />
      </button>
    </LazyCountryPickerPopover>
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
    cn(
      ON_CARD,
      "p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground data-[popup-open]:bg-white/[0.08] data-[popup-open]:text-foreground",
    );
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
              // A mark like the places beside it, a step dimmer: one more to add.
              className={cn(mark, "text-foreground/55")}
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
 *  each card's centre across in % of the stage's width and up or down in rem from the
 *  stage's centre, its width in rem, its turn on the table in degrees. Two large
 *  ones on the diagonal (upper left, lower right) carry the weight; two peek out
 *  from behind the visitor's card, one over its top edge and one under its foot,
 *  so no side of it is bare; two small ones far out (right and high, left and
 *  low) are the accents. The visitor's card is 42rem by 26.5, so ±31% by
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
 *  see-through card shows the shimmer through it), out of focus the way a lens
 *  sets what is behind its subject (a blur, from 1px near to 3px far: each card
 *  its own depth, never a layer laid over them, which had an edge and banded
 *  in its fade), and turned a little less toward the middle. */
function placed({ x, y, w, rz }: (typeof AROUND)[number]) {
  const near = (w - SMALL) / (LARGE - SMALL);
  // Placed by left and top in the stage (a share of its width across, rem down),
  // each card carrying its own perspective: neither a container query nor a
  // perspective on the stage, either of which makes the stage one flat layer
  // and leaves the hero's shimmer nothing to lie between (components/light).
  return {
    width: `${(w * RECEDE).toFixed(2)}rem`,
    left: `calc(50% + ${(x * RECEDE).toFixed(2)}%)`,
    top: `calc(50% + ${(y * RECEDE).toFixed(2)}rem)`,
    transform: `translate(-50%, -50%) perspective(${EYE}px) rotateY(${(-Math.sign(x) * (4 + 6 * near)).toFixed(1)}deg) rotateZ(${rz}deg)`,
    "--dim": (0.38 + 0.3 * near).toFixed(2),
    "--blur": `${(3.5 - 2 * near).toFixed(2)}px`,
  } as React.CSSProperties;
}

/** How far the whole spread stands behind the visitor's card: every card a tenth
 *  smaller and a tenth nearer the middle, as a step back in perspective takes
 *  them, the composition (`AROUND`) unchanged. */
const RECEDE = 0.9;

/** How far the eye stands from the cards, in px: the perspective each turns in. */
const EYE = 1600;

/** A real card under the hand: in focus, lifted a little (up, never scaled: a
 *  scaled card is a stretched picture of itself), in full light, and tilted toward the hand,
 *  its near edge going down where the hand presses (±9° across, ±7° up and down:
 *  `HoloLean`'s flat pose, ±3°, read as no tilt at this size). Its shadow on the
 *  table under it is close and small at rest, and falls longer and softer as it
 *  lifts. Eased both ways, so it follows with a little weight and settles flat
 *  when the hand leaves. */
const PICKED = cn(
  CORNER,
  // Slow and soft both ways: it comes into the light over a second, and the
  // tilt follows the hand over most of one, so it moves as a thing with weight
  // and never snaps.
  "brightness-(--dim) blur-(--blur) shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.6)] [transition:filter_1s_cubic-bezier(0.22,1,0.36,1),box-shadow_1s_cubic-bezier(0.22,1,0.36,1),transform_0.7s_cubic-bezier(0.22,1,0.36,1)]",
  "group-data-[hover]/holo:brightness-100 group-data-[hover]/holo:blur-none group-data-[hover]/holo:shadow-[0_2rem_3.5rem_-0.75rem_rgb(0_0_0/0.7)] group-data-[hover]/holo:[transform:perspective(1200px)_translateY(-0.5rem)_rotateY(calc((var(--px,0.5)-0.5)*18deg))_rotateX(calc((var(--py,0.5)-0.5)*-14deg))]",
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
        "relative w-full",
        forming
          ? cn(PROFILE.grid, PROFILE.frame)
          : "grid place-items-center py-16 sm:py-20 lg:h-[50rem] lg:py-8",
      )}
    >
      {!forming &&
        around.map((holder, i) => {
        const at = AROUND[i] as (typeof AROUND)[number];
        return (
          <div
            key={holder.username}
            // Under the hero's shimmer (components/light, z-[5]); under the hand
            // it comes up through it, in front, still under the visitor's card
            // (10). On leaving it goes back under a moment later, dimming on
            // under the shimmer: the shimmer is back at once, not after the
            // card's whole second (`PICKED`).
            className="absolute z-0 transition-[z-index] delay-200 duration-0 hover:z-[7] hover:delay-0 max-lg:hidden"
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
          the view transition carries it from the middle to its column, the
          profile's held pane (components/profile-layout). */}
      <div
        className={cn(
          "relative z-10 w-full [view-transition-name:your-card]",
          forming
            ? cn(
                PROFILE.identity,
                "lg:sticky lg:top-20 lg:self-start lg:[grid-area:side]",
              )
            : "max-w-[42rem]",
        )}
      >
        {children}
      </div>
      {forming && (
        // Over the hero's shimmer, as the card is: it is the page's subject.
        <main className={cn(PROFILE.places, "relative z-10")}>{preview}</main>
      )}
    </div>
  );
}

/** What the home shows under its hero (the sign-ups), only while the visitor's
 *  card is a card: once it is becoming their profile, the page is that profile
 *  and nothing else, as a profile's page is. */
export function UnlessForming({ children }: { children: React.ReactNode }) {
  return useForming() ? null : children;
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
