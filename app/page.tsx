import type { Metadata } from "next";
import { GUTTER } from "@/components/frame";
import { Hero } from "@/components/landing/hero";
import { LatestUsers } from "@/components/latest_users/latest_users";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Graph paper under the hero, fading out from it: 32px squares, the rhythm's rung. */
const PAPER =
  "bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_70%_60%_at_25%_45%,black,transparent)]";

export default function Page() {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div aria-hidden className={cn("absolute inset-0 -z-10", PAPER)} />
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl flex-1 gap-16 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:py-24",
          GUTTER,
        )}
      >
        <div className="lg:flex lg:flex-col lg:justify-center">
          <Hero />
        </div>
        <LatestUsers className="lg:min-h-[28rem]" />
      </div>
    </div>
  );
}
