import { getName } from "country-list";
import { ReactCountryFlag } from "react-country-flag";

export default function Flag({ country }: { country: string }) {
  if (country === "XX") {
    return (
      <span
        role="img"
        aria-label="unknown country"
        title="unknown country"
        className="text-xl"
      >
        🌐
      </span>
    );
  }
  return (
    <ReactCountryFlag
      svg
      className="!m-0"
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
