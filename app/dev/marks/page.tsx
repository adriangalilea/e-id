// DEVELOPMENT PAGE, never in production: candidate logos in the hologram's seal's
// language (rings, ticks, a person at the heart), each on its glass tile at every
// size it would stand at, the current logo first for reference. The pick becomes
// the logo (components/brand, BrandLogo) and the favicon (app/icon.svg).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wide } from "@/components/frame";
import { Glass } from "@/components/ui/material-glass";
import { MARK_PATH } from "@/lib/mark";

export const metadata: Metadata = { title: "marks", robots: "noindex" };

const f = (n: number) => n.toFixed(2);

/** Ticks between two radii round (cx, cy), `n` of them, skipping those whose
 *  angle falls in `gap` (degrees, 0 at 3 o'clock, clockwise): a rosette. */
function ticks(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  n: number,
  gap?: [number, number],
): string {
  return Array.from({ length: n }, (_, i) => (i * 360) / n)
    .filter((deg) => !gap || deg < gap[0] || deg > gap[1])
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const p = (r: number) =>
        `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
      return `M${p(r1)}L${p(r2)}`;
    })
    .join("");
}

/** An arc of a circle from `from` to `to` degrees (0 at 3 o'clock, clockwise). */
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  };
  const large = (to - from + 360) % 360 > 180 ? 1 : 0;
  return `M${p(from)}A${r} ${r} 0 ${large} 1 ${p(to)}`;
}

type Mark = { name: string; note: string; draw: React.ReactNode };

const STROKE = { fill: "none", stroke: "currentColor", strokeLinecap: "round" } as const;

const MARKS: Mark[] = [
  {
    name: "now · the flat 👤",
    note: "for reference: the logo as it is",
    draw: <path d={MARK_PATH} fill="currentColor" />,
  },
  {
    name: "a · seal",
    note: "the card's seal made the logo: an outer ring, a rosette of ticks, the person inside an inner ring, the shoulders only an arc",
    draw: (
      <>
        <circle cx="12" cy="12" r="10.6" {...STROKE} strokeWidth="1.1" />
        <path d={ticks(12, 12, 7.6, 9.4, 32)} {...STROKE} strokeWidth="0.7" />
        <circle cx="12" cy="10" r="2.6" fill="currentColor" />
        <path d={arc(12, 18.6, 5.2, 205, 335)} {...STROKE} strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: "b · rippling",
    note: "the head a dot, the person radiating from it in rings that the shoulders' line cuts: no body drawn, the symmetry broken by the cut leaning",
    draw: (
      <>
        <circle cx="12" cy="9" r="2.8" fill="currentColor" />
        <path d={arc(12, 9, 5.6, 150, 30)} {...STROKE} strokeWidth="1.3" />
        <path d={arc(12, 9, 8.6, 160, 22)} {...STROKE} strokeWidth="1" />
        <path d={arc(12, 9, 11.4, 168, 14)} {...STROKE} strokeWidth="0.7" />
        <path d="M3.5 20.5Q12 13.5 20.5 18.5" {...STROKE} strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: "c · open seal",
    note: "a, with its rings opened to the lower right, where the shoulders leave them: the light comes from the top left, as it does on the page",
    draw: (
      <>
        <path d={arc(12, 12, 10.6, 70, 20)} {...STROKE} strokeWidth="1.1" />
        <path d={ticks(12, 12, 7.8, 9.4, 28, [10, 80])} {...STROKE} strokeWidth="0.7" />
        <circle cx="11" cy="10" r="2.7" fill="currentColor" />
        <path d="M5.5 19.2C7 15.6 9 14.6 11 14.6S15.2 15.8 17.2 19.8" {...STROKE} strokeWidth="1.6" />
      </>
    ),
  },
  {
    name: "d · engraved",
    note: "the 👤 drawn the way an engraver would, in three contours of itself stepping in toward the light, the outermost broken where it meets the shoulders",
    draw: (
      <>
        <circle cx="12" cy="8" r="4.2" {...STROKE} strokeWidth="1" />
        <circle cx="11.6" cy="7.7" r="2.6" {...STROKE} strokeWidth="0.8" />
        <circle cx="11.3" cy="7.5" r="1.1" fill="currentColor" />
        <path d="M3.6 21.4A8.4 7.6 0 0 1 20.4 21.4" {...STROKE} strokeWidth="1" />
        <path d="M6.2 21.4A5.9 5.3 0 0 1 17.4 20.6" {...STROKE} strokeWidth="0.8" />
        <path d="M9 21.4A3.2 2.8 0 0 1 14.6 20.4" {...STROKE} strokeWidth="0.7" />
      </>
    ),
  },
];

function Tile({ draw, size }: { draw: React.ReactNode; size: string }) {
  return (
    <Glass
      shape="surface"
      className="grid shrink-0 place-items-center text-white [--glass-radius:22.5%]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-[66%]">
        {draw}
      </svg>
    </Glass>
  );
}

export default function Marks() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Wide className="gap-14">
      <p className="font-mono text-xs text-foreground/50">
        dev: logo candidates in the seal&apos;s language, each on its tile at
        128, 64, 32 and 16 px, and set in the address.
      </p>
      {MARKS.map((m) => (
        <section
          key={m.name}
          className="grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[14rem_1fr]"
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-mono text-sm">{m.name}</h2>
            <p className="text-sm text-foreground/55">{m.note}</p>
          </div>
          <div className="flex flex-wrap items-end gap-8">
            {["8rem", "4rem", "2rem", "1rem"].map((size) => (
              <Tile key={size} draw={m.draw} size={size} />
            ))}
            <span className="flex items-baseline gap-[0.1em] text-5xl font-medium tracking-[-0.04em]">
              <span className="inline-block size-[1.2cap] self-center">
                <Tile draw={m.draw} size="100%" />
              </span>
              .to/you
            </span>
          </div>
        </section>
      ))}
    </Wide>
  );
}
