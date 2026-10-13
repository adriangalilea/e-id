"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { IdCard, NAME } from "@/components/id-card";
import { type SocialPlatform, socialPlatforms } from "@/db/schema";
import { EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { toHandle, useDraft, writeDraft } from "@/lib/draft";
import { countryList } from "@/lib/country_list";
import { getSocialIcon } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** A field written on the card: no box, no line, the card's own type. What is
 *  not written yet shows faint in its place, as a blank form's printed labels. */
const FIELD =
  "min-w-0 bg-transparent outline-none placeholder:text-foreground/25 focus-visible:placeholder:text-foreground/15";

/** The places as the card shows them (id-card, `Flair`), each one a press: a place
 *  on the card takes it off; the "+" lays the ones not on it beside it, faint,
 *  and pressing one puts it on. */
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

/** That the address is a real one, under the hero's pill, quiet: the emoji
 *  domain with the handle being written, and the same as a browser sends it. */
export function RealAddress() {
  const path = `/${useDraft().handle || "you"}`;
  return (
    // Breaking between its parts, never inside one, when a long handle leaves the
    // whole no room on one line.
    <p className="flex flex-wrap gap-x-[1ch] font-mono text-[0.6875rem] tracking-wide text-foreground/30 *:whitespace-nowrap">
      <span>
        <span className="font-sans">👤</span>.to{path} ·
      </span>
      <span>
        {EMOJI_DOMAIN_PUNYCODE}
        {path} ·
      </span>
      <span>a real domain, type it</span>
    </p>
  );
}

/** THE HOME'S BLANK CARD: an e-id with nothing written on it yet, filled in where
 *  it lies, as a real one is: the name on the name's line, the handle after the
 *  address, the country picked on its flag, the places pressed onto it. Nothing
 *  explains it; every field shows faint what goes there. What is written is the
 *  visitor's draft (lib/draft), which the pill's sign-in carries on. */
export function FillCard() {
  const draft = useDraft();
  return (
    <IdCard
      heading="p"
      holo="laminate"
      className="[--id-card-thickness:1]"
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
        // The address as the card writes it, the handle typed after its slash;
        // as wide as what is typed (a monospace field is that many characters).
        address: (
          <label className="flex min-w-0 items-center self-start font-mono text-[3cqw] text-foreground/50">
            <EmojiDomain path="/" className="shrink-0" />
            <input
              aria-label="your username"
              placeholder="you"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              size={Math.max(draft.handle.length, 3)}
              value={draft.handle}
              onChange={(e) => writeDraft({ handle: toHandle(e.target.value) })}
              className={cn(FIELD, "text-foreground/85")}
            />
          </label>
        ),
        // The country's own picker, unseen, over the flag: pressing the flag opens
        // the list the browser gives every select.
        country: (
          <label className="relative flex items-center gap-[1.5cqw] font-mono">
            {draft.country === "XX" ? "" : draft.country}
            <CountryFlag country={draft.country} className="text-[4cqw]" />
            <select
              aria-label="your country"
              value={draft.country}
              onChange={(e) => writeDraft({ country: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {countryList.map(({ value, label }) => (
                <option key={value} value={value}>
                  {value === "XX" ? "none" : label}
                </option>
              ))}
            </select>
          </label>
        ),
        flair: <Places places={draft.places} />,
      }}
    />
  );
}
