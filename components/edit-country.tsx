"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { CountryFlag, countryName } from "@/components/country";
import { Button } from "@/components/ui/button";
import { LazyCountryPickerPopover } from "@/components/ui/country-picker-lazy";

/** "XX" is the country of a user who never set one (components/country). */
const NONE = "XX";

/** The edit form's country (`country_code`): its flag and name on a button that
 *  opens the registry's picker (@ag/country-picker, loaded as the form is drawn),
 *  "none" among its choices. The chosen code rides the form in its own hidden
 *  field, so the form reads it as it reads every other. */
export default function EditCountry({ saved }: { saved: string }) {
  const [code, setCode] = useState(saved);
  return (
    <>
      <input type="hidden" name="country_code" value={code} />
      <LazyCountryPickerPopover
        value={code === NONE ? undefined : code}
        onChange={(picked) => setCode(picked ?? NONE)}
        none="none"
        label="your country"
      >
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-fit justify-between gap-2"
        >
          <CountryFlag country={code} />
          {countryName(code) ?? "no country"}
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </LazyCountryPickerPopover>
    </>
  );
}
