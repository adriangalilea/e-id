import { countries } from "country-flag-icons";

const NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/** Every country the flag set draws, by the English name a place's last part is
 *  likely to say ("Spain"), longest first, so "South Korea" is found before
 *  "Korea" could be. */
const BY_NAME = countries
  .filter((code) => /^[A-Z]{2}$/.test(code))
  .flatMap((code) => {
    const name = NAMES.of(code);
    return name && name !== code ? [{ code, name: name.toLowerCase() }] : [];
  })
  .sort((a, b) => b.name.length - a.name.length);

/** The country a free-text place names ("Barcelona, Spain", "Tokyo · Japan"), as
 *  its code, or null when it names none: only a whole country name counts, so a
 *  city or a joke ("the internet") gives nothing rather than a guess. */
export function countryOf(place: string): string | null {
  const said = ` ${place.toLowerCase().replace(/[^\p{L}\s]/gu, " ")} `;
  return BY_NAME.find(({ name }) => said.includes(` ${name} `))?.code ?? null;
}
