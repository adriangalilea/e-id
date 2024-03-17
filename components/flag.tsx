import { getName } from "country-list";
import { ReactCountryFlag } from "react-country-flag";

export default function Flag({ country }: { country: string }) {
  return (
    <ReactCountryFlag
      svg
      countryCode={country}
      title={getName(country)}
      aria-label={`${getName(country)} country flag`}
      style={{
        width: "1.5em",
        height: "1.5em",
      }}
    />
  );
}
