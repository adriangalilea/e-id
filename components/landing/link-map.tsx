"use client";

import { useEffect, useState } from "react";
import { EmojiDomain } from "@/components/brand";
import type { SocialPlatform } from "@/db/schema";
import { EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { shortName } from "@/lib/place-names";
import { getSocialIcon } from "@/lib/socials";

/** How long each place is shown, typed, drawn to and arrived at. */
const STEP_MS = 3200;

/** The domain an address can be written on, in turn: the brand, the plain one
 *  where an emoji is not welcome, the emoji spelled out for a bio that drops
 *  it. Each opens the same page. */
const DOMAINS = [
  { shown: <EmojiDomain />, host: "👤.to" },
  { shown: "e-id.to", host: "e-id.to" },
  { shown: EMOJI_DOMAIN_PUNYCODE, host: EMOJI_DOMAIN_PUNYCODE },
] as const;

/** ONE LINK, SHOWN WORKING: the address, its domain turning through the forms
 *  it can be written in, a place's short name typed onto its end (app/
 *  [username]/[place]: /gh), and a line drawn from there to where it lands:
 *  the place's own address. Then the next place, on another domain, in turn.
 *  The whole address is a link that goes where it says. Each step remounts
 *  (its key), so its arrival plays again (globals.css, `link-*`). Under
 *  reduced motion it holds its first step. */
export function LinkMap({
  username,
  places,
}: {
  username: string;
  places: { platform: SocialPlatform; url: string }[];
}) {
  // The first of each kind, as the redirect takes it.
  const first = places.filter(
    (p, i) => places.findIndex((q) => q.platform === p.platform) === i,
  );
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  const domain = DOMAINS[step % DOMAINS.length] as (typeof DOMAINS)[number];
  const place = first[step % Math.max(first.length, 1)];
  if (!place) throw new Error(`${username}'s card has no place to show`);
  const name = shortName(place.platform);
  const lands = place.url.replace(/^(https?:\/\/|mailto:)(www\.)?/, "");
  return (
    <a
      key={step}
      href={`https://${domain.host}/${username}/${name}`}
      className="group/link flex flex-wrap items-center justify-center gap-x-5 gap-y-4 font-mono text-xl sm:text-2xl"
    >
      <span className="whitespace-nowrap text-foreground">
        <span className="inline-block animate-[link-arrive_500ms_cubic-bezier(0.22,1,0.36,1)_both]">
          {domain.shown}
        </span>
        /{username}
        <span className="inline-block animate-[link-type_450ms_steps(4,end)_350ms_both] text-foreground">
          /{name}
        </span>
      </span>
      {/* The line from the address to where it lands, drawn from its start. */}
      <span
        aria-hidden
        className="h-px w-16 origin-left animate-[link-draw_600ms_cubic-bezier(0.22,1,0.36,1)_850ms_both] bg-foreground/40 sm:w-24"
      />
      <span className="flex items-center gap-2.5 whitespace-nowrap text-base text-foreground/55 animate-[link-arrive_500ms_cubic-bezier(0.22,1,0.36,1)_1300ms_both] group-hover/link:text-foreground/80 sm:text-lg [&_svg]:size-5">
        {getSocialIcon(place.platform)}
        {lands}
      </span>
    </a>
  );
}
