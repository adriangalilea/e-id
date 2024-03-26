"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { countryList } from "./country_list";

export default function CountryPicker({
  savedCountry,
}: {
  savedCountry: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(savedCountry);

  const selectedCountryLabel = countryList.find(
    (country) => country.value === value,
  )?.label;

  useEffect(() => {
    // Assuming your form has an identifiable ID or class
    const form = document.querySelector("form");
    const hiddenInput = form?.querySelector('input[name="country_code"]') as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = value;
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between rounded-none"
        >
          {selectedCountryLabel || "Select country..."}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] rounded-none p-0">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {countryList.map((country) => (
                <CommandItem
                  key={country.value}
                  value={`${country.value} ${country.label}`}
                  onSelect={() => {
                    setValue(country.value);
                    setOpen(false);
                  }}
                  className="rounded-none"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {country.label}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}