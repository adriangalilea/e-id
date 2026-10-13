import { countryName as nameOf, Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

/** "XX" is the country of a user who never set one, the only code with no flag:
 *  every other comes from the country picker's list, all of which @ag/flag draws. */
const UNKNOWN = "XX";

/** A person's country as its flag (@ag/flag), beside their name. One never set
 *  keeps the flag's room, an empty dashed frame, so a list's names stay in line. */
export function CountryFlag({
  country,
  label,
  className,
}: {
  country: string;
  /** "" when the country's name is written beside it. */
  label?: string;
  className?: string;
}) {
  if (country === UNKNOWN)
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-[0.75em] w-[1.125em] shrink-0 border border-dashed border-foreground/25 align-[-0.08em]",
          className,
        )}
      />
    );
  return <Flag code={country} label={label} className={className} />;
}

/** The country's name as a profile states it, or nothing for one never set. */
export function countryName(country: string): string | undefined {
  return country === UNKNOWN ? undefined : nameOf(country);
}
