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
  // Every part in a room of its own size, so nothing moves as the steps turn:
  // the domain right-aligned in the longer domain's width (e-id.to, 7ch, the
  // type being mono), the end in the longest end's, what is there in a fixed
  // box, centred in it.
  const endRoom = Math.max(...landings.map((l) => (l.end ? l.end.length + 1 : 0)));
  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-6">
      <a
        href={`https://${domain.host}/${username}${landing.end ? `/${landing.end}` : ""}`}
        className="flex font-mono text-xl whitespace-nowrap text-foreground sm:text-2xl"
      >
        <span className="inline-block w-[7ch] text-right">{domain.shown}</span>
        <span>/{username}</span>
        <span className="inline-block text-left" style={{ width: `${endRoom}ch` }}>
          {landing.end && (
            <span
              key={step}
              className="inline-block animate-[link-type_450ms_steps(4,end)_both]"
            >
              /{landing.end}
            </span>
          )}
        </span>
      </a>
      {/* The line from the address to where it lands, drawn from its start. */}
      <span
        key={`line-${step}`}
        aria-hidden
        className="h-px w-20 shrink-0 origin-left animate-[link-draw_600ms_cubic-bezier(0.22,1,0.36,1)_450ms_both] bg-foreground/40 max-lg:hidden"
      />
      <div className="grid h-[20rem] w-full max-w-[22rem] shrink-0 place-items-center">
        <div
          key={`there-${step}`}
          className="w-full animate-[link-arrive_600ms_cubic-bezier(0.22,1,0.36,1)_900ms_both]"
        >
          {landing.there}
        </div>
      </div>
    </div>
  );
}
