// DEVELOPMENT PAGE, never in production: the hero's words in candidate type, to
// pick by eye. Two sweeps, each varying ONE thing: the current face at three
// weights, then four faces at one weight. Each sample is the real headline (the
// logo and the address) over the real lead line, at their real sizes.

import type { Metadata } from "next";
import {
  Geist,
  Instrument_Sans,
  Inter_Tight,
  Space_Grotesk,
} from "next/font/google";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { Wide } from "@/components/frame";

export const metadata: Metadata = { title: "type", robots: "noindex" };

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500"] });
const geist = Geist({ subsets: ["latin"], weight: ["300", "400", "500"] });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500"] });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500"] });

type Sample = { name: string; face: string; weight: number };

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

function Words({ face, weight }: Sample) {
  return (
    <div className={`${face} flex flex-col gap-5`}>
      <p
        className="text-[clamp(3rem,5.6vw,5.25rem)] leading-[0.95] tracking-[-0.045em] whitespace-nowrap"
        style={{ fontWeight: weight }}
      >
        <span className="relative mr-[0.1em]">
          <BrandLogo />
        </span>
        .to/you
      </p>
      <p className="max-w-md text-xl leading-snug text-foreground/65 sm:text-2xl">
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
    </Wide>
  );
}
