// DEVELOPMENT PAGE, never in production: the hero's words in candidate type, to
// pick by eye. Two sweeps, each varying ONE thing: the current face at three
// weights, then four faces at one weight. Each sample is the real headline (the
// logo and the address) over the real lead line, at their real sizes.

import type { Metadata } from "next";
import { Geist, Instrument_Sans, Inter_Tight } from "next/font/google";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { Wide } from "@/components/frame";

export const metadata: Metadata = { title: "type", robots: "noindex" };

/** Space Grotesk is the site's own (app/layout), a variable font: loading it again
 *  here gave a second face of the same family name, and the browser mixed the two
 *  (300 drew as 400). So it is the page's own font, its weight set on the axis. */
const spaceGrotesk = { className: "font-sans" };
const geist = Geist({ subsets: ["latin"], weight: ["300", "400", "500"] });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500"] });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500"] });

type Sample = {
  name: string;
  face: string;
  weight: number;
  /** The headline's ink and the lead's, when not the page's own. */
  ink?: { title: string; lead: string };
};

/** The ink's temperature, the third sweep, at the face and weight now in use. */
const INKS: Sample[] = [
  {
    name: "neutral (now): white 97%, the lead that white at 65%",
    ink: { title: "oklch(0.97 0 0)", lead: "oklch(0.97 0 0 / 0.65)" },
  },
  {
    name: "cool: a breath of blue, the lead a solid cool grey",
    ink: { title: "oklch(0.97 0.008 250)", lead: "oklch(0.74 0.015 250)" },
  },
  {
    name: "warm: paper white, the lead a solid warm grey",
    ink: { title: "oklch(0.96 0.01 85)", lead: "oklch(0.73 0.012 75)" },
  },
  {
    name: "silver: the title lit top to bottom like the card's foil-less metal",
    ink: {
      title: "linear-gradient(180deg, oklch(0.99 0 0), oklch(0.8 0.01 250))",
      lead: "oklch(0.72 0.01 250)",
    },
  },
].map((s) => ({ ...s, face: "font-sans", weight: 500 }));

const WEIGHTS: Sample[] = [300, 400, 500].map((weight) => ({
  name: `space grotesk ${weight}${weight === 500 ? " (now)" : ""}`,
  face: spaceGrotesk.className,
  weight,
}));

const FACES: Sample[] = [
  { name: "space grotesk 400", face: spaceGrotesk.className, weight: 400 },
  { name: "geist 400", face: geist.className, weight: 400 },
  { name: "inter tight 400", face: interTight.className, weight: 400 },
  { name: "instrument sans 400", face: instrumentSans.className, weight: 400 },
];

function Words({ face, weight, ink }: Sample) {
  const gradient = ink?.title.startsWith("linear-gradient");
  return (
    <div className={`${face} flex flex-col gap-5`}>
      <p
        className="text-[clamp(3rem,5.6vw,5.25rem)] leading-[0.95] tracking-[-0.045em] whitespace-nowrap"
        style={{
          fontWeight: weight,
          fontVariationSettings: `"wght" ${weight}`,
          ...(ink &&
            (gradient
              ? {
                  backgroundImage: ink.title,
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }
              : { color: ink.title })),
        }}
      >
        <span className="relative mr-[0.1em]">
          <BrandLogo />
        </span>
        .to/you
      </p>
      <p
        className="max-w-md text-xl leading-snug text-foreground/65 sm:text-2xl"
        style={ink && { color: ink.lead }}
      >
        one link for every place you are online.
      </p>
    </div>
  );
}

function Sweep({ title, samples }: { title: string; samples: Sample[] }) {
  return (
    <section className="flex flex-col gap-10 border-t border-white/10 pt-8">
      <h2 className="font-mono text-sm">{title}</h2>
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        {samples.map((s) => (
          <figure key={s.name} className="flex flex-col gap-4">
            <figcaption className="font-mono text-[11px] text-foreground/45">
              {s.name}
            </figcaption>
            <Words {...s} />
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function TypePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Wide className="gap-16">
      <p className="font-mono text-xs text-foreground/50">
        dev: the hero&apos;s words in candidate type. first the weight, then the
        face.
      </p>
      <Sweep title="the weight, same face" samples={WEIGHTS} />
      <Sweep title="the face, same weight" samples={FACES} />
      <Sweep title="the ink, same face and weight" samples={INKS} />
    </Wide>
  );
}
