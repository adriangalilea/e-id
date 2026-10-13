"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { lazy, Suspense, use, useEffect, useRef, useState } from "react";
import { EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { type Holder, IdCard, NAME, type Place } from "@/components/id-card";
import { useChip } from "@/components/session/use-chip";
import { HoloLean, HoloLight } from "@/components/ui/holo";
import { useToast } from "@/components/ui/use-toast";
import { claimDraft, type HandleState, handleState } from "@/db/actions";
import { type SocialPlatform, socialPlatforms } from "@/db/schema";
import type { Card } from "@/lib/card";
import { EMOJI_DOMAIN } from "@/lib/const";
import {
  clearDraft,
  type Draft,
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

/** Solid: a card hides what is behind it, as a real one does. */
const SOLID = "[--id-card-thickness:1]";

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
              className={SOLID}
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
      className={SOLID}
      holder={{
        name: draft.name,
        username: draft.handle || "you",
        image: null,
        country: draft.country,
        bio: null,
      }}
      slots={{
        name: (
          <input
            aria-label="your name"
            placeholder="your name"
            autoComplete="name"
            spellCheck={false}
            value={draft.name}
            onChange={(e) => writeDraft({ name: e.target.value })}
            className={cn(NAME, FIELD, "w-full")}
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
          autoComplete="username"
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
      className={SOLID}
      holder={use(cardHolder(username))}
    />
  );
}

// ── the others' ─────────────────────────────────────────────────────────────

/** Where the cards under the top one lie: turned out from under it, smaller and
 *  dimmer with depth, so the stack reads as real cards dealt on the page. With a
 *  hand on the stack they spread a little further, as cards do when touched.
 *  Dimmed by brightness, never opacity, and solid: a see-through card showed the
 *  hero's shimmer through it, as if lying on it. */
const UNDER = [
  "-rotate-[8deg] -translate-x-[9%] translate-y-[7%] scale-[0.93] brightness-[0.6] group-data-hover/holo:-rotate-[9.5deg] group-data-hover/holo:-translate-x-[11.5%] group-data-hover/holo:translate-y-[8%]",
  "rotate-[7deg] translate-x-[10%] -translate-y-[8%] scale-[0.88] brightness-[0.35] group-data-hover/holo:rotate-[8.5deg] group-data-hover/holo:translate-x-[12.5%] group-data-hover/holo:-translate-y-[9.5%]",
];

/** OTHER PEOPLE'S CARDS, on the right: what a filled one is, shown rather than
 *  told. The maker's and the newest whole ones (a photo, a name, a country), the
 *  visitor's own left out (it is on the left), dealt in a stack: the top one
 *  leaning toward the hand, its hologram showing as it turns. */
export function Others({ people }: { people: Holder[] }) {
  const own = useChip()?.u;
  const [top, ...under] = people
    .filter((holder) => holder.username !== own)
    .slice(0, UNDER.length + 1);
  if (!top) return null;
  return (
    <HoloLight className="relative w-full">
      {under.map((holder, i) => (
        <IdCard
          key={holder.username}
          holder={holder}
          heading="p"
          holo="laminate"
          className={cn(
            "absolute inset-0 transition-[rotate,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            SOLID,
            UNDER[i],
          )}
        />
      ))}
      <HoloLean pose="turned" className="relative max-lg:[transform:none]">
        <IdCard holder={top} heading="p" holo="laminate" className={SOLID} />
      </HoloLean>
    </HoloLight>
  );
}
