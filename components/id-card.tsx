import { BrandMark, EmojiDomain } from "@/components/brand";
import { CountryFlag, countryName } from "@/components/country";
import { Copy } from "@/components/ui/copy";
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

/** The card's sheen: a band of cold and violet light across it at an angle, the
 *  way a printed hologram catches it. Faint; it is felt more than seen. */
const SHEEN =
  "bg-[linear-gradient(115deg,transparent_25%,color-mix(in_oklab,var(--glow)_10%,transparent)_42%,oklch(0.75_0.12_300/0.07)_52%,transparent_68%)]";

/** A machine-readable zone, as a passport prints under its holder: the kind, the
 *  country and the handle, then the name, upper case, every gap a "<", padded to
 *  the zone's width. Decoration that reads as data, because it is the holder's. */
const ZONE = 34;
function zone(holder: Holder): [string, string] {
  const plain = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "<");
  const pad = (s: string) => s.slice(0, ZONE).padEnd(ZONE, "<");
  return [
    pad(`ID<${holder.country}<${plain(holder.username)}<`),
    pad(`${plain(holder.name || holder.username)}<<`),
  ];
}

/** The face, square, inside the card: the avatar GitHub gave, or with none the
 *  mark itself, the empty photo slot it draws. */
function Photo({ holder }: { holder: Holder }) {
  return (
    <div className="grid size-24 shrink-0 place-items-center overflow-hidden border border-white/15 bg-white/5 sm:size-28">
      {holder.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- GitHub's avatar service
        <img src={holder.image} alt="" className="size-full object-cover" />
      ) : (
        <BrandMark className="size-full text-white/10" />
      )}
    </div>
  );
}

/** A person's e-id as a card: the electronic identity it is named for. The mark
 *  and the country across its head, the photo and the name, what they say of
 *  themselves, the page's address to copy, and the machine-readable zone at its
 *  foot. */
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
  const country = countryName(holder.country);
  const [zone1, zone2] = zone(holder);
  const address = `/${holder.username}`;
  return (
    <article
      data-slot="id-card"
      className={cn(
        "relative isolate flex flex-col overflow-hidden border border-white/12",
        "bg-linear-to-br from-white/[0.09] via-white/[0.035] to-white/[0.015]",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_40px_80px_-40px_rgb(0_0_0/0.95)]",
        className,
      )}
    >
      <div aria-hidden className={cn("absolute inset-0 -z-10", SHEEN)} />
      <header className="flex h-11 items-center justify-between border-b border-white/10 px-4">
        <span className="flex items-center gap-2 font-mono text-[11px] text-foreground/55">
          <BrandMark className="size-3.5 text-foreground/80" />
          e-id
        </span>
        <span className="flex items-center gap-2 font-mono text-[11px] text-foreground/55">
          {country}
          <CountryFlag country={holder.country} label="" className="text-base" />
        </span>
      </header>
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex items-end gap-4">
          <Photo holder={holder} />
          <div className="flex min-w-0 flex-col gap-1.5 pb-0.5">
            <Name className="text-[1.75rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance">

              {holder.name || `@${holder.username}`}
            </Name>
            <span className="truncate font-mono text-xs text-foreground/50">
              @{holder.username}
            </span>
          </div>
        </div>
        {holder.bio && (
          <p className="text-[15px] leading-relaxed text-pretty text-foreground/80">
            {holder.bio}
          </p>
        )}
        <div className="flex h-10 items-center justify-between border border-white/10 bg-black/20 pl-3 font-mono text-xs text-foreground/70">
          <EmojiDomain path={address} className="truncate" />
          <Copy
            value={`https://${EMOJI_DOMAIN}${address}`}
            className="size-10 rounded-none"
          />
        </div>
      </div>
      <footer
        aria-hidden
        className="border-t border-white/10 bg-black/15 px-4 py-3 font-mono text-[10px] leading-relaxed tracking-[0.18em] whitespace-nowrap text-foreground/30"
      >
        <div className="overflow-hidden">{zone1}</div>
        <div className="overflow-hidden">{zone2}</div>
      </footer>
    </article>
  );
}
