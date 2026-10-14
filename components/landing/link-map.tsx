"use client";

import { useEffect, useState } from "react";
import { EmojiDomain } from "@/components/brand";

/** How long each landing is shown: typed, drawn to and arrived at. */
const STEP_MS = 3600;

/** The domain an address is written on, a whole round on each: the brand, then
 *  the plain one, where an emoji is not welcome. Each opens the same page. */
const DOMAINS = [
  { shown: <EmojiDomain />, host: "👤.to" },
  { shown: "e-id.to", host: "e-id.to" },
] as const;

/** Where an address lands: the end typed onto it (none for the profile
 *  itself), and what is there, drawn (lib: `Features` builds them on the
 *  server, a card or the place's own preview). */
export type Landing = { end: string | null; there: React.ReactNode };

/** ONE LINK, SHOWN WORKING: the address written, still (the domain and the
 *  handle), and only its end changing: first nothing, landing on the profile
 *  itself, then each place's short name typed on (app/[username]/[place]: /gh)
 *  and a line drawn from there to where it lands, what is there shown. A round
 *  on each domain in turn. Only the end, the line and what is there remount
 *  each step (their key), so only they arrive again (globals.css, `link-*`).
 *  Under reduced motion it holds its first step. */
export function LinkMap({
  username,
  landings,
}: {
  username: string;
  landings: Landing[];
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  const domain = DOMAINS[
    Math.floor(step / landings.length) % DOMAINS.length
  ] as (typeof DOMAINS)[number];
  const landing = landings[step % landings.length];
  if (!landing) throw new Error(`${username} has nowhere to land`);
  return (
    <div className="grid grid-cols-1 items-center justify-items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
      <a
        href={`https://${domain.host}/${username}${landing.end ? `/${landing.end}` : ""}`}
        className="font-mono text-xl whitespace-nowrap text-foreground sm:text-2xl lg:justify-self-end"
      >
        {domain.shown}/{username}
        {landing.end && (
          <span
            key={step}
            className="inline-block animate-[link-type_450ms_steps(4,end)_both]"
          >
            /{landing.end}
          </span>
        )}
      </a>
      {/* The line from the address to where it lands, drawn from its start. */}
      <span
        key={`line-${step}`}
        aria-hidden
        className="h-px w-20 origin-left animate-[link-draw_600ms_cubic-bezier(0.22,1,0.36,1)_450ms_both] bg-foreground/40 max-lg:hidden"
      />
      <div
        key={`there-${step}`}
        className="w-full max-w-[22rem] animate-[link-arrive_600ms_cubic-bezier(0.22,1,0.36,1)_900ms_both] lg:justify-self-start"
      >
        {landing.there}
      </div>
    </div>
  );
}
