import { EmojiDomain } from "@/components/brand";
import { Copy } from "@/components/ui/copy";
import type { SocialPlatform } from "@/db/schema";
import { EMOJI_DOMAIN } from "@/lib/const";
import { shortName } from "@/lib/place-names";
import { getSocialIcon } from "@/lib/socials";

/** ONE LINK, DRAWN: the address in the middle, and from it a curve out to each
 *  place it reaches (app/[username]/[place]: the address, then the place's
 *  short name), half on each side. Each end a link that goes there. The curves
 *  are one SVG laid over the row, in shares of it (stretched to it, their
 *  stroke kept a hairline), meeting each place at its own height. On a phone,
 *  the address over the places, no curves. */
export function LinkMap({
  username,
  places,
}: {
  username: string;
  places: { platform: SocialPlatform; url: string }[];
}) {
  // The first of each kind, as the redirect takes it.
  const kinds = places
    .filter((p, i) => places.findIndex((q) => q.platform === p.platform) === i)
    .map((p) => p.platform);
  const half = Math.ceil(kinds.length / 2);
  const sides = [kinds.slice(0, half), kinds.slice(half)] as const;
  // Each place's height in the row, as a share: spread evenly down its side.
  const heightOf = (i: number, n: number) => ((i + 0.5) / n) * 100;
  const curve = (side: 0 | 1, y: number) =>
    side === 0
      ? `M 33 50 C 26 50, 26 ${y}, 19 ${y}`
      : `M 67 50 C 74 50, 74 ${y}, 81 ${y}`;
  return (
    <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 hidden size-full text-foreground/20 max-lg:hidden lg:block"
      >
        {sides.map((places, side) =>
          places.map((platform, i) => (
            <path
              key={platform}
              d={curve(side as 0 | 1, heightOf(i, places.length))}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
      </svg>
      <Side username={username} places={sides[0]} align="end" />
      <div className="relative flex flex-col items-center gap-3 lg:order-none lg:px-10">
        <a
          href={`https://${EMOJI_DOMAIN}/${username}`}
          className="font-mono text-2xl text-foreground underline decoration-foreground/25 underline-offset-[0.3em] transition-colors hover:decoration-foreground/70 sm:text-3xl"
        >
          <EmojiDomain path={`/${username}`} />
        </a>
        <Copy
          value={`https://${EMOJI_DOMAIN}/${username}`}
          label
          className="rounded-full"
        />
      </div>
      <Side username={username} places={sides[1]} align="start" />
    </div>
  );
}

/** One side's places, spread down its height, each a link to it. */
function Side({
  username,
  places,
  align,
}: {
  username: string;
  places: SocialPlatform[];
  align: "start" | "end";
}) {
  return (
    <ul
      className={
        align === "end"
          ? "flex flex-col gap-6 max-lg:items-center lg:items-end lg:pr-[8%]"
          : "flex flex-col gap-6 max-lg:items-center lg:items-start lg:pl-[8%]"
      }
    >
      {places.map((platform) => {
        const name = shortName(platform);
        return (
          <li key={platform}>
            <a
              href={`/${username}/${name}`}
              className="flex items-center gap-2 font-mono text-sm text-foreground/60 transition-colors hover:text-foreground [&_svg]:size-4"
            >
              {getSocialIcon(platform)}/{name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
