import { BrandMark } from "@/components/brand";
import { CopyAddress } from "@/components/copy-address";
import { CountryFlag } from "@/components/country";
import { FoilEdge } from "@/components/foil-edge";
import { Glass } from "@/components/ui/material-glass";
import type { SelectSocial } from "@/db/schema";
import { HOLO_PRINTS, type HoloPrint } from "@/lib/holo";
import { getSocialIcon } from "@/lib/socials";
import { cn } from "@/lib/utils";

export type { HoloPrint };

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

/** THE KNOCKOUT: what is written on the card stays readable over its print, as a
 *  real ID clears its security print around the holder's data. Every glyph and
 *  every mark carries a soft halo of the card's own dark, so the print falls back
 *  right where the writing is and nowhere else. Text shadows reach the words; the
 *  icons, being SVG, take the same halo as a drop shadow. */
const KNOCKOUT =
  "[text-shadow:0_0_0.5cqw_rgb(14_14_16),0_0_1.2cqw_rgb(14_14_16)] [&_svg]:drop-shadow-[0_0_0.6cqw_rgb(14_14_16)]";

/** An ID-1 card, the size of every ID and bank card (ISO/IEC 7810): 85.6 by 53.98
 *  mm, its corners 3.18 mm round. Everything on the card is a share of its width
 *  (cqw), so it is the same card at any size. */
const ID1_RATIO = "85.6/53.98";
const ID1_RADIUS = `${(3.18 / 85.6) * 100}cqw`;

/** The face, square: the avatar GitHub gave, or with none the mark itself, the
 *  empty photo slot it draws. */
function Portrait({
  holder,
  className,
}: {
  holder: Holder;
  /** Its size and shape where a layout wants another than 30 cqw square. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid aspect-square w-[30cqw] shrink-0 place-items-center overflow-hidden rounded-[1.4cqw] bg-white/5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
        className,
      )}
    >
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
 *  band of foil running through its print as the card turns (lib/holo draws the
 *  prints; `id-card-holo` in globals.css lights them). The seal bites the photo's
 *  corner, where a real one sits so the photo cannot be swapped; where that corner
 *  is, is the layout's (`SEAL`). */
function Hologram({
  print,
  seal,
}: {
  print: HoloPrint;
  seal: string;
}) {
  return (
    <span
      aria-hidden
      data-slot="id-card-holo"
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={HOLO_PRINTS as React.CSSProperties}
    >
      <span
        data-slot="id-card-holo-print"
        data-print={print}
        className="absolute inset-0"
      />
      <span
        data-slot="id-card-holo-seal"
        className={cn("absolute size-[14cqw]", seal)}
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
      className="-mx-[1.1cqw] flex items-center gap-[0.6cqw] text-foreground/70 [&_svg]:size-[4.6cqw] [&_svg]:stroke-[1.4]"
    >
      {places.map(({ platform, url }) => (
        <a
          key={url}
          href={url}
          rel="me noopener"
          target="_blank"
          aria-label={platform}
          className="rounded-[1.2cqw] p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground"
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
/** How the card's room is given out, every one the same structure (the head
 *  alone above; the photo with the name, the address and the places beside it),
 *  each a different answer to the band left empty under the head. All in cqw on
 *  the ID-1 card, 63 tall, 51 inside its padding:
 *  `now`: a 30 square photo and the body at the foot.
 *  `tall`: the photo 3:4 (30 by 40), rising into the band.
 *  `bigger`: the photo 36 square and the name 8, the body filling the card.
 *  `centred`: `now`'s sizes, the body centred between the head and the foot. */
export type CardLayout = "now" | "tall" | "bigger" | "centred";

/** Where each layout's photo has the corner its seal bites: centred on it. */
const SEAL: Record<CardLayout, string> = {
  now: "bottom-[29cqw] left-[29cqw]",
  tall: "bottom-[39cqw] left-[29cqw]",
  bigger: "bottom-[35cqw] left-[35cqw]",
  centred: "bottom-[37cqw] left-[29cqw]",
};

/** Each layout's sizes: the photo, the name, and how the body sits. */
const SIZES: Record<
  CardLayout,
  { photo: string; name: string; body: string }
> = {
  now: { photo: "", name: "text-[7cqw]", body: "" },
  tall: { photo: "aspect-[3/4]", name: "text-[7cqw]", body: "" },
  bigger: { photo: "w-[36cqw]", name: "text-[8cqw]", body: "" },
  centred: { photo: "", name: "text-[7cqw]", body: "my-auto" },
};

export function IdCard({
  holder,
  heading = "h1",
  holo,
  layout = "now",
  className,
}: {
  holder: Holder;
  /** The name's element: the profile's h1, a sample's p. */
  heading?: "h1" | "p";
  /** The security print (`Hologram`), for a card someone can turn. */
  holo?: HoloPrint;
  layout?: CardLayout;
  className?: string;
}) {
  const Name = heading;
  const name = holder.name || `@${holder.username}`;
  const places = holder.places ?? [];
  const head = (
    <header
      className={cn(
        "relative flex items-center justify-between text-[3cqw] text-foreground/60",
        KNOCKOUT,
      )}
    >
      <span className="flex items-center gap-[1.5cqw] font-medium tracking-tight text-foreground/85">
        <BrandMark className="h-[1cap] w-auto" />
        e-id
      </span>
      <span className="flex items-center gap-[1.5cqw] font-mono">
        {holder.country === "XX" ? "" : holder.country}
        <CountryFlag country={holder.country} className="text-[4cqw]" />
      </span>
    </header>
  );
  const size = SIZES[layout];
  const body = (
    <>
      {head}
      <div className={cn("relative flex items-end gap-[5cqw]", size.body)}>
        <Portrait holder={holder} className={size.photo} />
        <div
          className={cn("flex min-w-0 flex-col gap-[1.5cqw] pb-[1cqw]", KNOCKOUT)}
        >
          <Name
            // The size first: tailwind-merge drops a line height set before a
            // font size, a font size carrying one of its own.
            className={cn(
              size.name,
              "line-clamp-2 leading-[1.02] font-medium tracking-[-0.03em] text-balance",
            )}
          >
            {name}
          </Name>
          <CopyAddress username={holder.username} />
          <Flair places={places} />
        </div>
      </div>
    </>
  );
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
        {holo && <Hologram print={holo} seal={SEAL[layout]} />}
        {body}
        <FoilEdge />
      </Glass>
    </div>
  );
}
