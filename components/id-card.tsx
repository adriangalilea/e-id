import { BrandMark } from "@/components/brand";
import { ON_CARD } from "@/components/card-shape";
import { CopyAddress } from "@/components/copy-address";
import { CountryFlag } from "@/components/country";
import { FoilEdge, Holo } from "@/components/ui/holo";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Image } from "@/components/ui/image";
import { Glass } from "@/components/ui/material-glass";
import { SocialProfile } from "@/components/ui/social-profile";
import type { ProfileFacts } from "@/lib/social-profile-core";
import { CARD_LAYOUT, cqw } from "@/lib/card-layout";
import { nameFit } from "@/lib/name-fit";
import { type HoloPrint, MARK_EMBLEM } from "@/lib/holo";
import type { LinkPlatform } from "@/db/schema";
import { type CardLink, handleOf, valueOf } from "@/lib/link-names";
import { getLinkIcon } from "@/lib/links";
import { cn } from "@/lib/utils";

export type { HoloPrint };

/** Who a card is for. A profile's own fields, or the home's sample for "you". */
export type Holder = {
  name: string | null;
  username: string;
  image: string | null;
  country: string;
  bio: string | null;
  /** Their public links, the card's flair. */
  links?: HolderLink[];
};

/** A link as the card draws it (lib/link-names, `CardLink`), and who they are
 *  behind it where it was read as a profile (lib/presence `profiles`), shown
 *  behind its mark. */
export type HolderLink = CardLink & { profile?: ProfileFacts };

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

/** The hologram's print in the card's own unit (@ag/holo, `--holo-print-unit`):
 *  its tiles keep the share of the card they have on a 34rem (544px) card, the
 *  size they were drawn at, so the print grows and shrinks with the photo, the
 *  name and every word on the card, one physical thing at any size. */
const PRINT_UNIT = `${100 / 544}cqw`;

/** The face, square: the avatar GitHub gave, or with none the mark itself, the
 *  empty photo slot it draws. */
function Portrait({
  holder,
  stand,
  className,
}: {
  holder: Holder;
  /** Drawn where there is no photo, instead of the mark (`CardSlots.photo`). */
  stand?: React.ReactNode;
  /** Its size and shape where a layout wants another than 30 cqw square. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid aspect-square w-(--card-photo) shrink-0 place-items-center overflow-hidden bg-white/[0.1]",
        ON_CARD,
        className,
      )}
    >
      {holder.image ? (
        <Image src={holder.image} alt="" className="size-full object-cover" />
      ) : (
        (stand ?? <BrandMark className="h-1/2 text-white/30" />)
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
    <Image
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

/** A link's profile from what the link itself says, where it was never read (a
 *  site that refuses to be read, X): the handle its address ends in, named by it,
 *  as a profile with no name set is. None for what has no handle (a website). */
function knownOf(platform: LinkPlatform, url: string): ProfileFacts | undefined {
  const handle = handleOf(platform, valueOf(platform, url));
  if (!handle) return undefined;
  return { platform, url, handle, name: handle, kind: "person", counts: [] };
}

/** Where the person is, on the card itself: their links' marks in a row, as an ID
 *  carries its holder's entitlements, each one the way there. With the address,
 *  the card's only touchable parts are what it shows. `rel="me"`: the same person
 *  on both ends, which IndieWeb readers check. */
function Flair({ links }: { links: HolderLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav
      aria-label="links"
      // Each icon's padding (its hit area) taken back on every side, so the
      // glyphs, not their boxes, meet the words' edge. Spread across the
      // column, the first at its left and the last at its right, as the name
      // spans it; each link at most its slot (lib/card-layout), so a few
      // never stand at its two ends.
      className="-m-[1.1cqw] flex items-center justify-between text-foreground/70 [&_svg]:size-(--card-icon) [&_svg]:stroke-[1.4]"
      style={{
        width: `min(calc(100% + 2.2cqw), ${links.length * CARD_LAYOUT.iconSlot}cqw)`,
      }}
    >
      {links.map(({ platform, name, url, profile: read }) => {
        const profile = read ?? knownOf(platform, url);
        const mark = {
          href: url,
          rel: "me noopener",
          target: "_blank",
          "aria-label": name,
          className: cn(
            ON_CARD,
            "p-[1.1cqw] transition-colors hover:bg-white/[0.08] hover:text-foreground",
          ),
          children: getLinkIcon(platform),
        };
        // Who they are there, behind the mark while the hand rests on it.
        return profile ? (
          <HoverCard key={url}>
            <HoverCardTrigger {...mark} />
            <HoverCardContent material="glass" className="w-80 p-3">
              <SocialProfile facts={profile} form="compact" />
            </HoverCardContent>
          </HoverCard>
        ) : (
          <a key={url} {...mark} />
        );
      })}
    </nav>
  );
}

/** A person's e-id as the card it is named for, in glass: the mark and the country
 *  across its head, the portrait, the name and the handle, the address along its
 *  foot, the ghost image in its corner. What they say of themselves is the page's,
 *  under the card. How much the glass hides of what is behind it is inherited
 *  (`--id-card-thickness`, `--id-card-blur`): a card lying on others is set near
 *  solid by whoever stacks it, as a real card is. */
/** The seal bites the photo's top-right corner: centred on it. The card is 63 cqw
 *  tall, 51 inside its padding; under the 4.5 of the head the body (the 30 square
 *  photo) is centred in the 46.5 left, so its foot is 8.25 above the padding's
 *  and its top 44.25 from the card's foot; its right edge 36 from the left. */
const SEAL = "bottom-[37cqw] left-[29cqw] size-[14cqw]";

/** The name's column, beside the photo, in the card's width's shares. */
const NAME_COLUMN =
  100 - 2 * CARD_LAYOUT.pad - CARD_LAYOUT.photo - CARD_LAYOUT.gap;

/** The name as the card sets it. */
const NAME =
  "line-clamp-2 text-(length:--card-name) leading-[1.02] font-medium tracking-[-0.03em] text-balance [text-box:trim-start_cap_alphabetic]";

/** What a card can be written on with: each field's own control, where and at
 *  the size the written field takes (the home's blank card, filled in).
 *  `head` stands where the address does, across the head's left. */
export type CardSlots = {
  head?: React.ReactNode;
  name?: React.ReactNode;
  country?: React.ReactNode;
  flair?: React.ReactNode;
  /** What stands in the photo's frame when there is no photo: a glyph saying what
   *  the card is (a notice's), else the e-ID mark. */
  photo?: React.ReactNode;
};

export function IdCard({
  holder,
  heading = "h1",
  holo,
  slots,
  save,
  className,
}: {
  holder: Holder;
  /** The card saved as a contact (`CardSave`), on its photo: for a card that is
   *  someone's, shown where it can be kept. */
  save?: React.ReactNode;
  /** The name's element: the profile's h1, a sample's p. */
  heading?: "h1" | "p";
  /** The security print (`Hologram`), for a card someone can turn. */
  holo?: HoloPrint;
  /** Fields to write in, instead of the holder's written ones. */
  slots?: CardSlots;
  className?: string;
}) {
  const Name = heading;
  const name = holder.name || `@${holder.username}`;
  // On one line whenever it can be (lib/name-fit): the column beside the photo.
  const fit = nameFit(name, NAME_COLUMN, CARD_LAYOUT.name);
  const links = holder.links ?? [];
  const head = (
    <header
      className={cn(
        "relative flex items-center justify-between text-(length:--card-head) text-foreground/60",
        KNOCKOUT,
      )}
    >
      {/* The address heads the card, where the eye starts: it is what the card
          is for, the blank card's and the finished one's alike. */}
      {slots?.head ?? <CopyAddress username={holder.username} />}
      {slots?.country ?? (
        <span className="flex items-center gap-[1.5cqw] font-mono">
          {holder.country === "XX" ? "" : holder.country}
          <CountryFlag
            country={holder.country}
            className="text-(length:--card-flag)"
          />
        </span>
      )}
    </header>
  );
  // The head alone above, and the body (the photo; the name, the address and the
  // links beside it) centred in the room under it, the air shared above and
  // below rather than left as one empty band.
  const body = (
    <>
      {head}
      <div className="relative my-auto flex items-stretch gap-(--card-gap)">
        <Portrait holder={holder} stand={slots?.photo} />
        <div
          // The rest of the card's width beside the photo, so a field written in
          // its stead has the room the written line would; as tall as the
          // photo, the name and the links sharing its height evenly, spaced
          // round each, rather than pinned to its top edge and its foot.
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-around gap-[1.5cqw]",
            KNOCKOUT,
          )}
        >
          {slots?.name ?? (
            <Name className={cn(NAME, fit.lines === 1 && "whitespace-nowrap")}>
              {name}
            </Name>
          )}
          {slots?.flair ?? <Flair links={links} />}
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
        className="flex aspect-(--id1-ratio) w-full flex-col justify-between overflow-hidden p-(--card-pad) [--glass-radius:var(--id1-radius)] [--glass-thickness:var(--id-card-thickness,0.3)] [--glass-blur:var(--id-card-blur,9px)]"
        style={
          {
            "--id1-ratio": ID1_RATIO,
            "--id1-radius": ID1_RADIUS,
            "--holo-print-unit": PRINT_UNIT,
            // The layout (lib/card-layout), the one the share image, the embed
            // and the link preview draw too: every size on the card reads it.
            "--card-pad": cqw(CARD_LAYOUT.pad),
            "--card-head": cqw(CARD_LAYOUT.head),
            "--card-flag": cqw(CARD_LAYOUT.flag),
            "--card-photo": cqw(CARD_LAYOUT.photo),
            "--card-gap": cqw(CARD_LAYOUT.gap),
            "--card-name": cqw(fit.size),
            "--card-icon": cqw(CARD_LAYOUT.icon),
            // What the glass does to what lies behind it, its blur unless the
            // card says otherwise (`--id-card-backdrop`): a solid card shows
            // nothing behind it, and a blur of what it hides, done again every
            // frame a card floats, was the home's whole cost.
            "--glass-backdrop":
              "var(--id-card-backdrop, blur(var(--id-card-blur, 9px)) saturate(1.25))",
          } as React.CSSProperties
        }
      >
        {/* The prints lie in the card, under everything written on it: drawn
            first, and what is written is positioned so it paints over them. */}
        <Ghost holder={holder} />
        {/* THE HOLOGRAM, as an ID card's security laminate (@ag/holo): nearly
            invisible face on, a band of foil running through its print as the
            card turns. The seal bites the photo's corner, where a real one sits
            so the photo cannot be swapped (`SEAL`). */}
        {holo && (
          <Holo
            print={holo}
            seal={SEAL}
            emblem={MARK_EMBLEM}
          />
        )}
        {body}
        {/* The card's own action, the save, in its foot's corner: on the
            padding, its edges on the card's inner margin, as the flag's are at
            its head. */}
        {save && (
          <div className="absolute right-(--card-pad) bottom-(--card-pad) z-20">
            {save}
          </div>
        )}
        <FoilEdge />
      </Glass>
    </div>
  );
}
