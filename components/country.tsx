import { getName } from "country-list";
import { cn } from "@/lib/utils";

/** "XX" is the country of a user who never set one. */
const UNKNOWN = "XX";

/** A country as its ISO code in a square of mono type, the name on hover. Codes
 *  read the same on every system, which flag emoji do not (Windows draws two
 *  letters, and no flag at all for most). */
export function CountryCode({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  const unknown = country === UNKNOWN;
  const name = unknown ? "unknown country" : getName(country);
  if (!name) throw new Error(`country code ${country} has no name`);
  return (
    <abbr
      title={name}
      aria-label={name}
      className={cn(
        "inline-grid h-6 w-8 shrink-0 place-items-center border font-mono text-[11px] leading-none no-underline",
        unknown
          ? "border-dashed border-foreground/20 text-foreground/30"
          : "border-foreground/25 text-foreground/80",
        className,
      )}
    >
      {unknown ? "--" : country}
    </abbr>
  );
}

/** The country's name as a profile states it, or nothing for one never set. */
export function countryName(country: string): string | undefined {
  if (country === UNKNOWN) return undefined;
  const name = getName(country);
  if (!name) throw new Error(`country code ${country} has no name`);
  return name;
}
