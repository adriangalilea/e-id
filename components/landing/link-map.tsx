"use client";

import { ArrowRight, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmojiDomain } from "@/components/brand";
import { Glass } from "@/components/ui/material-glass";

/** How long each landing is shown: typed, drawn to and arrived at. */
const STEP_MS = 3600;

/** The domain the address is written on: the brand, the one people share
 *  (e-id.to and the rest are the share menu's, components/addresses). One, so
 *  the address never changes width: a second, of another width, either moved
 *  the handle or left a gap in the bar. */
const DOMAINS = [{ shown: <EmojiDomain />, host: "👤.to" }] as const;

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
  const previous =
    step > 0 ? landings[(step - 1) % landings.length] : undefined;
  // Every part in a room of its own size, so nothing moves as the steps turn:
  // the domain right-aligned in the longer domain's width (e-id.to, 7ch, the
  // type being mono), the end in the longest end's, what is there in a fixed
  // box, centred in it.
  const endRoom = Math.max(...landings.map((l) => (l.end ? l.end.length + 1 : 0)));
  return (
    // Centred on one line: the bar, the arrow and what it lands on, each on
    // the row's middle, whatever its own height.
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-6">
      {/* The address as a browser's address bar draws one, the shape read as a
          link to open: a glass pill, a link's mark before it, the domain
          quieter than the handle, the end it lands on brightest. */}
      <a
        href={`https://${domain.host}/${username}${landing.end ? `/${landing.end}` : ""}`}
        className="group/link shrink-0"
      >
      <Glass shape="bar" className="[--glass-size:3.5rem]">
        <span className="flex items-center gap-3 px-5 font-mono text-lg whitespace-nowrap sm:text-xl">
          <Link2
            aria-hidden
            className="size-5 shrink-0 text-foreground/40"
            strokeWidth={1.5}
          />
          <span className="flex underline decoration-transparent underline-offset-[0.3em] transition-colors group-hover/link:decoration-foreground/50">
            <span className="text-foreground/50">{domain.shown}</span>
            <span className="text-foreground/85">/{username}</span>
            <span
              className="inline-block text-left text-foreground"
              style={{ width: `${endRoom}ch` }}
            >
              {landing.end && (
                <span
                  key={step}
                  className="inline-block animate-[link-type_450ms_steps(4,end)_both]"
                >
                  /{landing.end}
                </span>
              )}
            </span>
          </span>
        </span>
      </Glass>
      </a>
      {/* Where it goes: a quiet arrow, still. */}
      <span className="flex shrink-0 items-center">
        <ArrowRight
          aria-hidden
          className="size-5 text-foreground/30 max-lg:rotate-90"
          strokeWidth={1.5}
        />
      </span>
      {/* One room, the same size every step, so nothing round it moves; what
          is there stands in it whole, centred, its own object (a card is
          never boxed; a preview wears its own glass, `Landing`). The last
          one leaves as the next arrives, in the same place: one gives way to
          the other, never a pop. */}
      {/* Tall enough for the tallest landing (the card, 22rem wide); each laid
          over the room and centred in it on its own, so neither the one leaving
          nor the one arriving can size the room or move the other. */}
      <div className="relative h-[21rem] w-full max-w-[22rem] shrink-0">
        {previous && (
          <div
            key={`gone-${step}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center animate-[link-leave_500ms_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <div className="w-full">{previous.there}</div>
          </div>
        )}
        <div
          key={`there-${step}`}
          className="absolute inset-0 grid place-items-center animate-[link-arrive_700ms_cubic-bezier(0.22,1,0.36,1)_250ms_both]"
        >
          <div className="w-full">{landing.there}</div>
        </div>
      </div>
    </div>
  );
}
