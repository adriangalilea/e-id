import { BrandMark, MARK_PATH } from "@/components/brand";
import { CopyAddress } from "@/components/copy-address";
import { CountryFlag } from "@/components/country";
import { Glass } from "@/components/ui/material-glass";
import type { SelectSocial } from "@/db/schema";
import { getSocialIcon } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** Who a card is for. A profile's own fields, or the home's sample for "you". */
export type Holder = {
  name: string | null;
  username: string;
  image: string | null;
  country: string;
  bio: string | null;
  /** Their public places, the card's flair. */
  places?: Place[];
};

/** A place a person is: the platform, and the address that opens it. */
export type Place = { platform: SocialPlatform; url: string };

type SocialPlatform = SelectSocial["platform"];

/** An ID-1 card, the size of every ID and bank card (ISO/IEC 7810): 85.6 by 53.98
 *  mm, its corners 3.18 mm round. Everything on the card is a share of its width
 *  (cqw), so it is the same card at any size. */
const ID1_RATIO = "85.6/53.98";
const ID1_RADIUS = `${(3.18 / 85.6) * 100}cqw`;

/** The face, square: the avatar GitHub gave, or with none the mark itself, the
 *  empty photo slot it draws. */
function Portrait({ holder }: { holder: Holder }) {
  return (
    <div className="grid aspect-square w-[30cqw] shrink-0 place-items-center overflow-hidden rounded-[1.4cqw] bg-white/5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
      {holder.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- GitHub's avatar service
        <img src={holder.image} alt="" className="size-full object-cover" />
      ) : (
        <BrandMark className="h-1/2 text-white/15" />
      )}
    </div>
  );
}

/** The ghost image an ID prints beside its portrait: the same face again, as a
 *  security print rather than a photo. Real ones are line-screened (printed or
 *  laser-engraved in fine lines) and fade into the card with no frame, and that is
 *  what keeps this from reading as a second picture: grey, seen through a screen of
 *  horizontal lines (one pixel of line, two of gap), dissolving to nothing at its
 *  edges, the two masks intersected. */
const GHOST_MASK =
  "[mask-image:radial-gradient(closest-side,black_35%,transparent),repeating-linear-gradient(to_bottom,black_0_1px,transparent_1px_3px)] [mask-composite:intersect]";

function Ghost({ holder }: { holder: Holder }) {
  if (!holder.image) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- GitHub's avatar service
    <img
      src={holder.image}
      alt=""
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-[6cqw] right-[2cqw] aspect-square w-[34cqw] object-cover opacity-30 contrast-125 grayscale",
        GHOST_MASK,
      )}
    />
  );
}

/** THE HOLOGRAM, as an ID card's security laminate: nearly invisible face on, a
 *  band of iridescent light running through it as the card turns. What it is made
 *  of is printed, not painted, so it is drawn here from geometry as SVG used as a
 *  MASK (white where the laminate is): bands of guilloché (interlaced sine waves,
 *  the line work of banknotes), the 👤 mark repeated small in a staggered grid, and
 *  a seal over the photo's corner (rings, a rosette of ticks and the mark), which
 *  is where a real one sits so the photo cannot be swapped. The colour, the band
 *  of light and how strongly it shows are the stylesheet's (`id-card-holo` in
 *  globals.css), read from what turns the card (`--px`, `--py`). */
function svgUrl(width: number, height: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Five sine waves a fifth of a turn apart, one period every 80 px, in a band 40 px
 *  tall: a tile that repeats seamlessly across and stacks into ribbons down. */
function guilloche(): string {
  const W = 160;
  const H = 40;
  const waves = Array.from({ length: 5 }, (_, i) => {
    const phase = (i * 2 * Math.PI) / 5;
    const points = Array.from({ length: W / 2 + 1 }, (_, k) => {
      const x = k * 2;
      const y = H / 2 + 9 * Math.sin((2 * Math.PI * x) / 80 + phase);
      return `${x},${y.toFixed(2)}`;
    });
    return `<polyline points="${points.join(" ")}" fill="none" stroke="#fff" stroke-width="0.45"/>`;
  });
  return svgUrl(W, H, waves.join(""));
}

/** The mark, 10 px, twice in a 72 px tile, staggered: a texture, not a print. */
function emblems(): string {
  const at = (x: number, y: number) =>
    `<path transform="translate(${x} ${y}) scale(0.42)" d="${MARK_PATH}" fill="#fff"/>`;
  return svgUrl(72, 72, at(8, 8) + at(44, 44));
}

/** A seal: two rings, a rosette of 48 ticks between them, the mark at its heart. */
function seal(): string {
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 48;
    const p = (r: number) =>
      `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(31)}L${p(40)}`;
  });
  return svgUrl(
    100,
    100,
    `<circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="1.2"/>` +
      `<circle cx="50" cy="50" r="28" fill="none" stroke="#fff" stroke-width="0.8"/>` +
      `<path d="${ticks.join("")}" stroke="#fff" stroke-width="0.6"/>` +
      `<path transform="translate(32 32) scale(1.5)" d="${MARK_PATH}" fill="#fff"/>`,
  );
}

/** THE WEB, the other print: people linked across the card, the web of who knows
 *  whom. Nodes on a jittered grid (so they spread over the whole card rather than
 *  clumping), each joined to its two nearest, a few hubs joined to four and drawn
 *  as the mark in a ring. Drawn once at the card's own proportions (100 across),
 *  from a fixed seed, and laid over the card whole, not tiled. */
function web(): string {
  const W = 100;
  const H = (100 * 53.98) / 85.6;
  let s = 19;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const COLS = 9;
  const ROWS = 6;
  const nodes = Array.from({ length: COLS * ROWS }, (_, i) => ({
    x: ((i % COLS) + 0.15 + random() * 0.7) * (W / COLS),
    y: (Math.floor(i / COLS) + 0.15 + random() * 0.7) * (H / ROWS),
    hub: random() < 0.12,
  }));
  const edges = new Set<string>();
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, a.hub ? 4 : 2);
    for (const { j } of nearest) edges.add(i < j ? `${i}-${j}` : `${j}-${i}`);
  });
  const f = (n: number) => n.toFixed(2);
  const lines = [...edges].map((key) => {
    const [i, j] = key.split("-").map(Number);
    const a = nodes[i];
    const b = nodes[j];
    if (!a || !b) throw new Error(`web: edge ${key} names a missing node`);
    return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  });
  const dots = nodes.map((n) =>
    n.hub
      ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2.3" fill="none" stroke="#fff" stroke-width="0.14"/>` +
        `<path transform="translate(${f(n.x - 1.5)} ${f(n.y - 1.6)}) scale(0.125)" d="${MARK_PATH}" fill="#fff"/>`
      : `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="0.35" fill="#fff"/>`,
  );
  return svgUrl(
    W,
    H,
    `<path d="${lines.join("")}" stroke="#fff" stroke-width="0.12" fill="none"/>${dots.join("")}`,
  );
}

const HOLO = {
  "--holo-guilloche": guilloche(),
  "--holo-emblems": emblems(),
  "--holo-web": web(),
  "--holo-seal": seal(),
} as React.CSSProperties;

/** Which print the hologram carries: the laminate (guilloché and emblems), or the
 *  web (people linked). Both carry the seal. */
export type HoloPrint = "laminate" | "web";

/** The hologram over the card, and the seal biting the photo's top-right corner:
 *  its centre on the corner, the portrait being 30 cqw square from the card's left
 *  and bottom padding of 6 cqw. */
function Hologram({ print }: { print: HoloPrint }) {
  return (
    <span
      aria-hidden
      data-slot="id-card-holo"
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={HOLO}
    >
      <span
        data-slot="id-card-holo-print"
        data-print={print}
        className="absolute inset-0"
      />
      <span
        data-slot="id-card-holo-seal"
        className="absolute bottom-[29cqw] left-[29cqw] size-[14cqw]"
      />
    </span>
  );
}

/** Where the person is, on the card itself: their places' marks in a row, as an ID
 *  carries its holder's entitlements, each one the way there. With the address,
 *  the card's only touchable parts are what it shows. `rel="me"`: the same person
 *  on both ends, which IndieWeb readers check. */
function Flair({ places }: { places: Place[] }) {
  if (places.length === 0) return null;
  return (
    <nav
      aria-label="places"
      className="-mx-[0.8cqw] flex items-center text-foreground/50 [&_svg]:size-[3.2cqw] [&_svg]:stroke-[1.5]"
    >
      {places.map(({ platform, url }) => (
        <a
          key={url}
          href={url}
          rel="me noopener"
          target="_blank"
          aria-label={platform}
          className="rounded-[0.8cqw] p-[0.8cqw] transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          {getSocialIcon(platform)}
        </a>
      ))}
    </nav>
  );
}

/** A person's e-id as the card it is named for, in glass: the mark and the country
 *  across its head, the portrait, the name and the handle, the address along its
 *  foot, the ghost image in its corner. What they say of themselves is the page's,
 *  under the card. How much the glass hides of what is behind it is inherited
 *  (`--id-card-thickness`, `--id-card-blur`): a card lying on others is set near
 *  solid by whoever stacks it, as a real card is. */
export function IdCard({
  holder,
  heading = "h1",
  holo,
  className,
}: {
  holder: Holder;
  /** The name's element: the profile's h1, a sample's p. */
  heading?: "h1" | "p";
  /** The security print (`Hologram`), for a card someone can turn. */
  holo?: HoloPrint;
  className?: string;
}) {
  const Name = heading;
  return (
    <div className={cn("@container w-full", className)}>
      <Glass
        as="article"
        shape="surface"
        data-slot="id-card"
        className="flex aspect-(--id1-ratio) w-full flex-col justify-between overflow-hidden p-[6cqw] [--glass-radius:var(--id1-radius)] [--glass-thickness:var(--id-card-thickness,0.3)] [--glass-blur:var(--id-card-blur,9px)]"
        style={
          {
            "--id1-ratio": ID1_RATIO,
            "--id1-radius": ID1_RADIUS,
          } as React.CSSProperties
        }
      >
        {/* The prints lie in the card, under everything written on it: drawn
            first, and what is written is positioned so it paints over them. */}
        <Ghost holder={holder} />
        {holo && <Hologram print={holo} />}
        <header className="relative flex items-center justify-between text-[3cqw] text-foreground/60">
          <span className="flex items-center gap-[1.5cqw] font-medium tracking-tight text-foreground/85">
            <BrandMark className="h-[1cap] w-auto" />
            e-id
          </span>
          <span className="flex items-center gap-[1.5cqw] font-mono">
            {holder.country === "XX" ? "" : holder.country}
            <CountryFlag country={holder.country} className="text-[4cqw]" />
          </span>
        </header>
        <div className="relative flex items-end gap-[5cqw]">
          <Portrait holder={holder} />
          <div className="flex min-w-0 flex-col gap-[1.5cqw] pb-[1cqw]">
            <Name className="line-clamp-2 text-[7cqw] leading-[1.02] font-medium tracking-[-0.03em] text-balance">
              {holder.name || `@${holder.username}`}
            </Name>
            <CopyAddress username={holder.username} />
            <Flair places={holder.places ?? []} />
          </div>
        </div>
      </Glass>
    </div>
  );
}
