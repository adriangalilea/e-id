"use client"

// A COUNTRY PICKER: a field over every country the flag set draws, each a row of its
// flag, its name and its code. A country is found the way people think of it: by its
// English name ("spain"), its own ("españa", "日本"), its code ("es", the one a
// form or a URL already says), the names it goes by that are not its official one
// ("usa", "uk", "holland", "ivory coast"), or its flag emoji pasted in. The reader's
// own countries lead while nothing is typed (`readerRegions`, from the browser's
// languages: en-GB and es-ES make "yours" the UK and Spain). Arrows walk the list,
// the field keeping focus (Base UI's autocomplete, as `command`), Enter takes the lit
// row, the chosen one is checked.
//
//   <CountryPickerPopover value={code} onChange={setCode}>
//     <button>{code ? <Flag code={code} /> : "country"}</button>
//   </CountryPickerPopover>
//
// `CountryPicker` is the panel alone, for a popover of your own or a page. Every
// country's flag is in it, about 180 KB of SVG (45 KB gzipped): load it when it is
// first opened (`React.lazy`), not with the page.

import { Autocomplete } from "@base-ui/react/autocomplete"
import { countries as FLAGGED } from "country-flag-icons"
import { Check, Search as SearchIcon } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  fuzzyFilter,
  queryWords,
  type Range,
} from "@/lib/fuzzy"
import { countryName, Flag } from "@/components/ui/flag"
import { InputGroup } from "@/components/ui/input"
import { type Material, useMaterial } from "@/components/ui/material"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollFade } from "@/components/ui/scroll-fade"
import { Highlight } from "@/components/ui/search"

export interface Country {
  /** ISO 3166-1 alpha-2, upper case */
  code: string
  /** its name in English (Intl) */
  name: string
  /** its name in its own main language, where that differs ("España") */
  own: string | null
  /** the names it goes by beside those ("usa", "holland") */
  aka: readonly string[]
}

/** Names people use that are not the one Intl gives, by code. Only real usage: an
 *  old name still said, an initialism, the part a country is called by. */
const AKA: Record<string, readonly string[]> = {
  AE: ["uae", "emirates"],
  BA: ["bosnia"],
  CD: ["congo", "drc", "zaire"],
  CG: ["congo"],
  CI: ["ivory coast"],
  CN: ["china", "prc"],
  CZ: ["czech republic"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales"],
  KP: ["north korea", "dprk"],
  KR: ["korea", "south korea"],
  MK: ["macedonia"],
  MM: ["burma"],
  NL: ["holland"],
  PS: ["palestine"],
  RU: ["russian federation"],
  SZ: ["swaziland"],
  TR: ["turkey", "türkiye"],
  TW: ["taiwan", "roc"],
  US: ["usa", "us", "america", "united states of america"],
  VA: ["vatican", "holy see"],
  VN: ["vietnam"],
}

/** Codes the set draws that name no country: the EU's flag, and two Intl cannot name. */
const NOT_COUNTRIES = new Set(["EU", "XC", "XO"])

let every: Country[] | null = null
/** Every country the flag set draws, by English name. Built once. */
export function countries(): Country[] {
  every ??= FLAGGED.filter((c) => /^[A-Z]{2}$/.test(c) && !NOT_COUNTRIES.has(c))
    .map((code) => {
      const name = countryName(code)
      if (name === code)
        throw new Error(`country-picker: Intl names no ${code}`)
      const language = new Intl.Locale(`und-${code}`).maximize().language
      const own = new Intl.DisplayNames([language], { type: "region" }).of(code)
      return {
        code,
        name,
        own: own && own !== name ? own : null,
        aka: AKA[code] ?? [],
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
  return every
}

/** A flag emoji's two regional indicators read as the code they spell ("🇪🇸" is
 *  "ES"), so a pasted flag finds its country. */
const unflag = (text: string) =>
  text.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, (c) =>
    String.fromCharCode((c.codePointAt(0) as number) - 0x1f1e6 + 65),
  )

export interface Found {
  country: Country
  /** what the query lit in its name */
  ranges: Range[]
}

/** The countries a query finds, best first: the one whose code it is, then those
 *  whose name has a word starting with each typed word, then those whose own name or
 *  other names do, then any that hold them; letters scattered in order only when
 *  nothing holds them as text (a guess shown as a find reads as junk). */
export function findCountries(query: string): Found[] {
  const q = unflag(query)
  const typed = queryWords(q)
  const found = fuzzyFilter(countries(), q, (c) => [
    c.name,
    ...(c.own ? [c.own] : []),
    c.code,
    ...c.aka,
  ])
  const words = (texts: readonly string[]) =>
    texts.flatMap((t) => queryWords(t))
  const starts = (texts: readonly string[]) =>
    typed.every((t) => words(texts).some((w) => w.startsWith(t)))
  const tier = ({ name, own, code, aka }: Country) =>
    typed.length === 1 && typed[0] === code.toLowerCase()
      ? 0
      : starts([name])
        ? 1
        : starts([...(own ? [own] : []), ...aka])
          ? 2
          : typed.every((t) =>
                words([name, own ?? "", ...aka]).some((w) => w.includes(t)),
              )
            ? 3
            : 4
  const ranked = found.map((f, at) => ({ f, at, tier: tier(f.item) }))
  const literal = ranked.filter((r) => r.tier < 4)
  return (literal.length > 0 ? literal : ranked)
    .sort((a, b) => a.tier - b.tier || a.at - b.at)
    .map(({ f }) => ({ country: f.item, ranges: f.ranges[0] ?? [] }))
}

const NO_REGIONS: readonly string[] = []
let reader: readonly string[] | null = null

/** A country's time zones as Intl lists them (`Intl.Locale`'s `getTimeZones`, or
 *  the older `timeZones` property; neither in Firefox yet, which gets none). */
function zonesOf(code: string): readonly string[] {
  const locale = new Intl.Locale(`und-${code}`) as Intl.Locale & {
    getTimeZones?: () => string[]
    timeZones?: string[]
  }
  return locale.getTimeZones?.() ?? locale.timeZones ?? []
}

/** The reader's countries, each once; none on the server. First where the
 *  device is: the country whose time zones hold the device's own (Europe/Madrid:
 *  Spain), the place a person is far more often than their browser's language
 *  says (an English browser in Spain). Then the languages it asks for (en-GB,
 *  es-ES: the UK, Spain). Both read on the device and sent nowhere: no
 *  lookup, no address, nothing about the reader leaves the browser. Read once:
 *  the same list every call, as a store's snapshot must be. */
export function readerRegions(): readonly string[] {
  if (typeof navigator === "undefined") return NO_REGIONS
  if (reader) return reader
  const known = countries().map((c) => c.code)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const here = known.find((code) => zonesOf(code).includes(zone))
  const out: string[] = here ? [here] : []
  for (const tag of navigator.languages) {
    const region = new Intl.Locale(tag).maximize().region
    if (region && known.includes(region) && !out.includes(region))
      out.push(region)
  }
  reader = out
  return reader
}

const noRegions = () => NO_REGIONS
const subscribeNever = () => () => {}
const onClient = () => true
const onServer = () => false

type Row = { key: string; country: Country | null; ranges: Range[] }
// A type, not an interface: Base UI types a group with an index signature.
type Section = { heading: string; items: Row[] }

export interface CountryPickerProps {
  /** the chosen code, or undefined for none */
  value: string | undefined
  onChange: (code: string | undefined) => void
  /** codes listed first under "yours" while nothing is typed; default the reader's
   *  (`readerRegions`) */
  suggested?: readonly string[]
  /** the no-country choice, listed first, with what it is called ("none") */
  none?: string
  placeholder?: string
  /** what it picks, for a screen reader */
  label?: string
  material?: Material
  autoFocus?: boolean
  className?: string
}

const ROW =
  "flex scroll-my-1 cursor-default select-none items-center gap-2.5 px-2 py-1.5 text-[13px] text-current/85 outline-none data-highlighted:text-current"

const FACE: Record<Material, string> = {
  plain: "rounded-md data-highlighted:bg-foreground/8",
  glass: "rounded-[10px] data-highlighted:bg-current/12",
}

export function CountryPicker({
  value,
  onChange,
  suggested,
  none,
  placeholder = "search countries",
  label = "country",
  material,
  autoFocus,
  className,
}: CountryPickerProps) {
  const m = useMaterial(material)
  const [query, setQuery] = React.useState("")
  const reader = React.useSyncExternalStore(
    subscribeNever,
    readerRegions,
    noRegions,
  )
  const first = suggested ?? reader
  // The names come from Intl, whose data differs between a server's runtime and
  // the browser (a country's own name, one's English name): the list is drawn in
  // the browser only, its names the reader's.
  const client = React.useSyncExternalStore(subscribeNever, onClient, onServer)
  const sections = React.useMemo((): Section[] => {
    if (!client) return []
    const row = (country: Country, ranges: Range[] = []): Row => ({
      key: country.code,
      country,
      ranges,
    })
    if (queryWords(query).length > 0)
      return [
        {
          heading: "found",
          items: findCountries(query).map((f) => row(f.country, f.ranges)),
        },
      ]
    const byCode = new Map(countries().map((c) => [c.code, c]))
    const yours = first.flatMap((code) => {
      const c = byCode.get(code)
      return c ? [{ ...row(c), key: `yours:${code}` }] : []
    })
    return [
      ...(none
        ? [
            {
              heading: "none",
              items: [{ key: "none", country: null, ranges: [] }],
            },
          ]
        : []),
      ...(yours.length > 0 ? [{ heading: "yours", items: yours }] : []),
      { heading: "every country", items: countries().map((c) => row(c)) },
    ]
  }, [client, query, first, none])

  return (
    <div
      data-slot="country-picker"
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
    >
      <Autocomplete.Root
        open
        inline
        autoHighlight="always"
        keepHighlight
        items={sections}
        filteredItems={sections}
        value={query}
        onValueChange={(next, details) => {
          // A row pressed picks; it never fills the field.
          if (details.reason !== "item-press") setQuery(next)
        }}
        itemToStringValue={(row: Row) => row.country?.name ?? none ?? ""}
      >
        <Autocomplete.Input
          data-slot="country-picker-input"
          render={
            <InputGroup size="sm" start={<SearchIcon />} className="w-full" />
          }
          aria-label={`search ${label}`}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoFocus={autoFocus}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.stopPropagation()
              event.preventBaseUIHandler()
              setQuery("")
            }
          }}
        />
        <ScrollFade className="max-h-[min(20rem,50dvh)] min-h-0 pt-2 pb-2">
          <Autocomplete.Empty
            data-slot="country-picker-empty"
            className="px-2 py-6 text-center text-[13px] text-current/50 empty:hidden"
          >
            no country called that
          </Autocomplete.Empty>
          <Autocomplete.List data-slot="country-picker-list" aria-label={label}>
            {(section: Section) => (
              <Autocomplete.Group
                key={section.heading}
                items={section.items}
                className="not-last:mb-2"
              >
                {section.heading !== "found" && section.heading !== "none" && (
                  <Autocomplete.GroupLabel className="px-2 pt-1 pb-1 font-mono text-[11px] text-current/45">
                    {section.heading}
                  </Autocomplete.GroupLabel>
                )}
                <Autocomplete.Collection>
                  {(row: Row) => {
                    const code = row.country?.code
                    const on = code === value
                    return (
                      <Autocomplete.Item
                        key={row.key}
                        value={row}
                        aria-selected={on}
                        onClick={() => onChange(code)}
                        data-slot="country-picker-item"
                        className={cn(ROW, FACE[m])}
                      >
                        {row.country ? (
                          <Flag code={row.country.code} label="" />
                        ) : (
                          <span
                            aria-hidden
                            className="inline-block h-[0.75em] w-[1.125em] shrink-0 border border-current/30 border-dashed"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {row.country ? (
                            <Highlight
                              text={row.country.name}
                              ranges={row.ranges}
                              className="text-current decoration-current/40"
                            />
                          ) : (
                            none
                          )}
                          {row.country?.own && (
                            <span className="ml-2 text-current/40">
                              {row.country.own}
                            </span>
                          )}
                        </span>
                        {on ? (
                          <Check aria-hidden className="size-3.5 shrink-0" />
                        ) : (
                          code && (
                            <span className="shrink-0 font-mono text-[11px] text-current/35">
                              {code}
                            </span>
                          )
                        )}
                      </Autocomplete.Item>
                    )
                  }}
                </Autocomplete.Collection>
              </Autocomplete.Group>
            )}
          </Autocomplete.List>
        </ScrollFade>
      </Autocomplete.Root>
    </div>
  )
}

/** The picker in a popover, opened by what it wraps (the consumer's own trigger: a
 *  flag, a field, a button) and shut by a pick. */
export function CountryPickerPopover({
  children,
  side = "bottom",
  align = "start",
  ...picker
}: Omit<CountryPickerProps, "autoFocus"> & {
  /** the trigger, one element */
  children: React.ReactElement
  side?: React.ComponentProps<typeof PopoverContent>["side"]
  align?: React.ComponentProps<typeof PopoverContent>["align"]
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent
        side={side}
        align={align}
        material={picker.material}
        className="w-80 p-2"
      >
        <CountryPicker
          {...picker}
          autoFocus
          onChange={(code) => {
            picker.onChange(code)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
