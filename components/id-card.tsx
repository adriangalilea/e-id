import { BrandMark, EmojiDomain } from "@/components/brand";
import { CountryFlag } from "@/components/country";
import { Copy } from "@/components/ui/copy";
import { Glass } from "@/components/ui/material-glass";
import { EMOJI_DOMAIN } from "@/lib/const";
import { cn } from "@/lib/utils";

/** Who a card is for. A profile's own fields, or the home's sample for "you". */
export type Holder = {
  name: string | null;
  username: string;
  image: string | null;
  country: string;
  bio: string | null;
};

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
        <BrandMark className="size-1/2 text-white/15" />
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

/** A person's e-id as the card it is named for, in glass: the mark and the country
 *  across its head, the portrait, the name and the handle, the address along its
 *  foot, the ghost image in its corner. What they say of themselves is the page's,
 *  under the card. */
export function IdCard({
  holder,
  heading = "h1",
  className,
}: {
  holder: Holder;
  /** The name's element: the profile's h1, a sample's p. */
  heading?: "h1" | "p";
  className?: string;
}) {
  const Name = heading;
  return (
    <div className={cn("@container w-full", className)}>
      <Glass
        as="article"
        shape="surface"
        data-slot="id-card"
        className="flex aspect-(--id1-ratio) w-full flex-col justify-between overflow-hidden p-[6cqw] [--glass-radius:var(--id1-radius)] [--glass-thickness:0.3] [--glass-blur:9px]"
        style={
          {
            "--id1-ratio": ID1_RATIO,
            "--id1-radius": ID1_RADIUS,
          } as React.CSSProperties
        }
      >
        <header className="flex items-center justify-between text-[3cqw] text-foreground/60">
          <span className="flex items-center gap-[1.5cqw] font-medium tracking-tight text-foreground/85">
            <BrandMark className="h-[1cap] w-auto" />
            e-id
          </span>
          <span className="flex items-center gap-[1.5cqw] font-mono">
            {holder.country === "XX" ? "" : holder.country}
            <CountryFlag country={holder.country} className="text-[4cqw]" />
          </span>
        </header>
        <div className="flex items-end gap-[5cqw]">
          <Portrait holder={holder} />
          <div className="flex min-w-0 flex-col gap-[1.5cqw] pb-[1cqw]">
            <Name className="line-clamp-2 text-[7cqw] leading-[1.02] font-medium tracking-[-0.03em] text-balance">
              {holder.name || `@${holder.username}`}
            </Name>
            <span className="flex min-w-0 items-center gap-[1cqw] font-mono text-[3cqw] text-foreground/50">
              <EmojiDomain path={`/${holder.username}`} className="truncate" />
              <Copy
                value={`https://${EMOJI_DOMAIN}/${holder.username}`}
                className="size-[7cqw] shrink-0 rounded-full [&_svg]:size-[3.4cqw]"
              />
            </span>
          </div>
        </div>
        <Ghost holder={holder} />
      </Glass>
    </div>
  );
}
