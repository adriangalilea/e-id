"use client";

import { useEffect, useState } from "react";
import { BrandMark, EmojiDomain } from "@/components/brand";
import type { SocialPlatform } from "@/db/schema";
import { shortName } from "@/lib/place-names";
import { getSocialIcon } from "@/lib/socials";

/** How long each place is shown, typed, drawn to and arrived at. */
const STEP_MS = 3200;

/** The domain an address is written on, a whole round of places on each: the
 *  brand, then the plain one, where an emoji is not welcome. Each opens the same
 *  page. */
const DOMAINS = [
  { shown: <EmojiDomain />, host: "👤.to" },
  { shown: "e-id.to", host: "e-id.to" },
] as const;

/** ONE LINK, SHOWN WORKING: the address written, still (the domain and the
 *  handle), and only its end changing: first nothing, landing on the profile
 *  itself, then each place's short name typed on (app/[username]/[place]: /gh)
 *  and a line drawn from there to where it lands, the place's own address. A
 *  round of places on each domain in turn. The whole address is a link that
 *  goes where it says. Only the end and where it lands remount each step (their
 *  key), so only they arrive again (globals.css, `link-*`). Under reduced
 *  motion it holds its first step. */
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
  // Each round: the profile itself, then every place.
  const round = first.length + 1;
  const domain = DOMAINS[
    Math.floor(step / round) % DOMAINS.length
  ] as (typeof DOMAINS)[number];
  const place = step % round === 0 ? null : first[(step % round) - 1];
  const name = place ? shortName(place.platform) : null;
  const lands = place
    ? place.url.replace(/^(https?:\/\/|mailto:)(www\.)?/, "")
    : "their e-ID";
  return (
    <a
      href={`https://${domain.host}/${username}${name ? `/${name}` : ""}`}
      className="group/link flex flex-wrap items-center justify-center gap-x-5 gap-y-4 font-mono text-xl sm:text-2xl"
    >
      <span className="whitespace-nowrap text-foreground">
        {domain.shown}/{username}
        {name && (
          <span
            key={step}
            className="inline-block animate-[link-type_450ms_steps(4,end)_both]"
          >
            /{name}
          </span>
        )}
      </span>
      {/* The line from the address to where it lands, drawn from its start. */}
      <span
        key={`line-${step}`}
        aria-hidden
        className="h-px w-16 origin-left animate-[link-draw_600ms_cubic-bezier(0.22,1,0.36,1)_450ms_both] bg-foreground/40 sm:w-24"
      />
      <span
        key={`lands-${step}`}
        className="flex items-center gap-2.5 whitespace-nowrap text-base text-foreground/55 animate-[link-arrive_500ms_cubic-bezier(0.22,1,0.36,1)_900ms_both] group-hover/link:text-foreground/80 sm:text-lg [&_svg]:size-5"
      >
        {place ? getSocialIcon(place.platform) : <BrandMark />}
        {lands}
      </span>
    </a>
  );
}
