import { ChevronLeft, Mail, MessageCircle, Phone, Video, X } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  parseVcard,
  type VCard,
  type VCardField,
} from "@/lib/vcard-core"
import { Image } from "@/components/ui/image"
import "./contacts-app.css"

// APPLE'S CONTACTS APP ON AN IPHONE (iOS 26), drawn from a vCard (lib/vcard-core):
// a picture of the app, never the app. Two screens: `import`, the sheet iOS raises
// when a .vcf is opened (the card, then Create New Contact and Add to Existing
// Contact; `pressed` lights the first, the instant before it saves), and `contact`,
// the saved card in Contacts (‹ Contacts, Edit, the face, the name, the four round
// actions dimmed where the card has no channel for them, then each kind of field its
// own inset group). It fills the positioned box it is put in, an `IphoneFrame`'s
// screen, and lays out in that box's own width: every length is an iOS point
// converted to cqw of a 402 pt screen (iPhone 16 Pro), so it is the same screen at
// any size. The status bar and the island are the frame's; their ink and the
// screen's ground behind them come from `contactsAppScreen`, since the frame draws
// them outside this box. One `role="img"`, its insides hidden from assistive tech.
// No state: it renders on the server.
//
//   <IphoneFrame style={contactsAppScreen("contact", "dark")}>
//     <ContactsApp vcard={vcfText} view="contact" />
//   </IphoneFrame>

export type ContactsAppView = "import" | "contact"
export type ContactsAppScheme = "light" | "dark"

/** The iPhone 16 Pro's screen width in points: every length below is a share of it. */
const SCREEN_PT = 402
const cqw = (pt: number) => `${((pt * 100) / SCREEN_PT).toFixed(3)}cqw`

/** UIKit's metrics, in points. */
const UIKIT = {
  // Safe areas: the status bar's band, the home indicator's.
  "safe-top": 62,
  "safe-bottom": 34,
  // Inset grouped lists: the side margin (also a row's text inset and the
  // separator's), a row's vertical padding, a group's corner and the gap between.
  margin: 16,
  "row-y": 11,
  radius: 11,
  gap: 20,
  // A bar's glass button, a capsule or a circle this tall; its glyphs.
  bar: 44,
  "bar-x": 14,
  // The scroll edge's reach past a bar, also the head room under it, so a card
  // at rest starts where the fade ends.
  edge: 10,
  chevron: 24,
  close: 20,
  // The header: the photo, its monogram, the name, the line under it.
  photo: 120,
  monogram: 48,
  "photo-gap": 12,
  title: 30,
  "title-leading": 36,
  // The four actions: a circle, its glyph, its label, the gap between.
  action: 50,
  icon: 22,
  "action-gap": 6,
  "head-gap": 20,
  // Dynamic Type at Large: body 17/22, subheadline 15/20, footnote 13/18,
  // caption 12/16.
  body: 17,
  "body-leading": 22,
  sub: 15,
  "sub-leading": 20,
  footnote: 13,
  "footnote-leading": 18,
  caption: 12,
  "caption-leading": 16,
  // The page sheet: the presenting screen pushed back behind it (its top, its
  // sides, its corner), the sheet's top and corner, its bar's top.
  "behind-top": 56,
  "behind-x": 16,
  "behind-radius": 12,
  "sheet-top": 66,
  "sheet-radius": 38,
  "sheet-bar-top": 16,
  // The home indicator.
  home: 140,
  "home-h": 5,
  "home-bottom": 8,
} as const

/** Every length the screens use: UIKit's, and the ones made of them. */
const PT = {
  ...UIKIT,
  // Where a card at rest starts and the scroll edge ends: under the page's bar,
  // or under the sheet's.
  "head-page": UIKIT["safe-top"] + UIKIT.bar + UIKIT.edge,
  "head-sheet": UIKIT["sheet-bar-top"] + UIKIT.bar + UIKIT.edge,
  // The room after the last group: the home indicator's band and a gap.
  foot: UIKIT["safe-bottom"] + UIKIT.gap,
  // The back capsule's chevron sits half a padding from its round end.
  "back-x": UIKIT["bar-x"] / 2,
  // The sheet's title keeps clear of the close button on both sides, so it is
  // centred on the sheet.
  "title-x": UIKIT.bar + UIKIT.margin,
}

/** UIKit's semantic colours, per appearance and per level: a page sits on the
 *  base level; a sheet is raised, which in dark lifts every grey a step. */
interface Palette {
  ground: string
  cell: string
  pressed: string
  separator: string
  label: string
  secondary: string
  dim: string
  tint: string
  glass: string
  "glass-shadow": string
}

const DARK_INK = {
  label: "#fff",
  secondary: "rgb(235 235 245 / 0.6)",
  dim: "rgb(235 235 245 / 0.3)",
  tint: "#0a84ff",
  glass: "rgb(255 255 255 / 0.1)",
  "glass-shadow":
    "inset 0 0.5px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.5px rgb(255 255 255 / 0.06)",
}

const LIGHT: Palette = {
  ground: "#f2f2f7",
  cell: "#fff",
  pressed: "#d1d1d6",
  separator: "rgb(60 60 67 / 0.29)",
  label: "#000",
  secondary: "rgb(60 60 67 / 0.6)",
  dim: "rgb(60 60 67 / 0.3)",
  tint: "#007aff",
  glass: "rgb(255 255 255 / 0.82)",
  "glass-shadow":
    "0 2px 10px rgb(0 0 0 / 0.08), inset 0 0 0 0.5px rgb(0 0 0 / 0.04)",
}

const PALETTE: Record<ContactsAppScheme, Record<"page" | "sheet", Palette>> = {
  dark: {
    page: {
      ...DARK_INK,
      ground: "#000",
      cell: "#1c1c1e",
      pressed: "#2c2c2e",
      separator: "#38383a",
    },
    sheet: {
      ...DARK_INK,
      ground: "#1c1c1e",
      cell: "#2c2c2e",
      pressed: "#3a3a3c",
      separator: "rgb(84 84 88 / 0.6)",
    },
  },
  light: { page: LIGHT, sheet: LIGHT },
}

/** Behind a page sheet: black round the screen it was raised over, that screen
 *  dimmed and pushed back. */
const BEHIND: Record<ContactsAppScheme, string> = {
  dark: "#111113",
  light: "#bdbdc2",
}

/** What the frame draws outside this box, for the frame's `style`: the status
 *  bar's ink (white over a sheet's black surround in either appearance, as iOS
 *  does) and the screen's ground under it. */
export function contactsAppScreen(
  view: ContactsAppView,
  scheme: ContactsAppScheme,
): React.CSSProperties {
  const ground = view === "import" ? "#000" : PALETTE[scheme].page.ground
  const ink = view === "import" || scheme === "dark" ? "#fff" : "#000"
  return {
    "--device-status-ink": ink,
    "--device-screen-background": ground,
  } as React.CSSProperties
}

type Kind = "phone" | "email" | "url" | "address"

/** iOS's own names for a vCard's types; a field with none is "other". */
const TYPE_NAME: Record<string, string> = {
  cell: "mobile",
  iphone: "iPhone",
}

/** A field's label as the Contacts app prints it: Apple's built-in labels
 *  (`_$!<HomePage>!$_`) in lowercase, a custom one as written, a TYPE in iOS's
 *  word for it. */
function labelOf(field: VCardField): string {
  const label = field.label
  if (!label) return "other"
  const builtin = /^_\$!<(.+)>!\$_$/.exec(label)
  if (builtin?.[1]) return builtin[1].toLowerCase()
  return TYPE_NAME[label] ?? label
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

const BODY =
  "text-(length:--ag-contacts-body) leading-(--ag-contacts-body-leading)"
const LABEL =
  "text-(length:--ag-contacts-footnote) leading-(--ag-contacts-footnote-leading) text-(--ag-contacts-secondary)"
const GLASS =
  "flex h-(--ag-contacts-bar) items-center justify-center rounded-full bg-(--ag-contacts-glass) text-(--ag-contacts-label) shadow-(--ag-contacts-glass-shadow)"
const GROUP =
  "mx-(--ag-contacts-margin) overflow-hidden rounded-(--ag-contacts-radius) bg-(--ag-contacts-cell)"
/** A row after the first carries the hairline above it, inset to the text. */
const ROW =
  "relative px-(--ag-contacts-margin) py-(--ag-contacts-row-y) not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-(--ag-contacts-margin) not-first:before:h-px not-first:before:bg-(--ag-contacts-separator) not-first:before:content-['']"

function Field({ kind, field }: { kind: Kind; field: VCardField }) {
  return (
    <div data-slot="contacts-app-row" className={ROW}>
      <div className={LABEL}>{labelOf(field)}</div>
      <div
        className={cn(
          BODY,
          "break-words",
          kind === "address"
            ? "text-(--ag-contacts-label)"
            : "text-(--ag-contacts-tint)",
        )}
      >
        {field.value}
      </div>
    </div>
  )
}

/** One inset group per kind of field, in the order the card lists them. */
function Fields({ card }: { card: VCard }) {
  const groups: [Kind, VCardField[]][] = [
    ["phone", card.phones],
    ["email", card.emails],
    ["url", card.urls],
    ["address", card.addresses],
  ]
  return (
    <>
      {groups
        .filter(([, fields]) => fields.length > 0)
        .map(([kind, fields]) => (
          <div key={kind} data-slot="contacts-app-section" className={GROUP}>
            {fields.map((field) => (
              <Field key={`${kind}:${field.value}`} kind={kind} field={field} />
            ))}
          </div>
        ))}
      {card.note && (
        <div data-slot="contacts-app-section" className={GROUP}>
          <div data-slot="contacts-app-row" className={ROW}>
            <div className={cn(LABEL, "text-(--ag-contacts-label)")}>Notes</div>
            <div
              className={cn(
                BODY,
                "whitespace-pre-line break-words text-(--ag-contacts-label)",
              )}
            >
              {card.note}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** A group of one-line commands in the tint, `lit` the row under a finger. */
function Commands({ rows, lit }: { rows: string[]; lit?: string }) {
  return (
    <div data-slot="contacts-app-section" className={GROUP}>
      {rows.map((row) => (
        <div
          key={row}
          data-slot="contacts-app-row"
          data-pressed={row === lit ? "" : undefined}
          className={cn(
            ROW,
            BODY,
            "text-(--ag-contacts-tint) data-pressed:bg-(--ag-contacts-pressed)",
          )}
        >
          {row}
        </div>
      ))}
    </div>
  )
}

/** The four channels, each present when the card holds a way to reach it. */
function channelsOf(card: VCard) {
  const phone = card.phones.length > 0
  const email = card.emails.length > 0
  return [
    { name: "message", Icon: MessageCircle, on: phone },
    { name: "call", Icon: Phone, on: phone },
    { name: "video", Icon: Video, on: phone || email },
    { name: "mail", Icon: Mail, on: email },
  ]
}

function Header({ card }: { card: VCard }) {
  const who = [card.title, card.org].filter(Boolean).join(" · ")
  return (
    <div className="flex flex-col items-center">
      <div
        data-slot="contacts-app-photo"
        className="grid size-(--ag-contacts-photo) shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-b from-[#a5abb9] to-[#858994] font-semibold text-(length:--ag-contacts-monogram) text-white"
      >
        {card.photo ? (
          <Image src={card.photo} alt="" className="size-full object-cover" />
        ) : (
          initials(card.name)
        )}
      </div>
      <div className="mt-(--ag-contacts-photo-gap) px-(--ag-contacts-margin) text-center font-semibold text-(--ag-contacts-label) text-(length:--ag-contacts-title) leading-(--ag-contacts-title-leading) tracking-[-0.01em]">
        {card.name}
      </div>
      {who && (
        <div className="px-(--ag-contacts-margin) text-center text-(--ag-contacts-secondary) text-(length:--ag-contacts-sub) leading-(--ag-contacts-sub-leading)">
          {who}
        </div>
      )}
      <div
        data-slot="contacts-app-actions"
        className="mt-(--ag-contacts-head-gap) grid w-full grid-cols-4 px-(--ag-contacts-margin)"
      >
        {channelsOf(card).map(({ name, Icon, on }) => (
          <div
            key={name}
            data-on={on ? "" : undefined}
            className="group/action flex flex-col items-center gap-(--ag-contacts-action-gap) text-(--ag-contacts-dim) data-on:text-(--ag-contacts-tint)"
          >
            <div className="grid size-(--ag-contacts-action) place-items-center rounded-full bg-(--ag-contacts-cell) *:col-start-1 *:row-start-1">
              <Icon
                className="size-(--ag-contacts-icon)"
                fill="currentColor"
                strokeWidth={1.4}
              />
              {name === "mail" && (
                // The flap cut out of the filled envelope, as SF's envelope.fill:
                // lucide draws its body over the flap, so the flap is drawn again
                // alone, on top, in the circle's colour.
                <Mail
                  className="size-(--ag-contacts-icon) text-(--ag-contacts-cell) [&>rect]:hidden"
                  strokeWidth={1.6}
                />
              )}
            </div>
            <div className="text-(length:--ag-contacts-caption) leading-(--ag-contacts-caption-leading)">
              {name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** iOS 26's scroll edge: the ground fading in under a bar's glass, so what has
 *  scrolled up passes softly beneath the buttons. */
function ScrollEdge({ head }: { head: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-(--ag-contacts-ground) from-45% to-transparent",
        head,
      )}
    />
  )
}

function HomeIndicator() {
  return (
    <div className="absolute bottom-(--ag-contacts-home-bottom) left-1/2 h-(--ag-contacts-home-h) w-(--ag-contacts-home) -translate-x-1/2 rounded-full bg-(--ag-contacts-label)" />
  )
}

/** The sheet over the screen it was raised from. Its card scrolls as iOS lets a
 *  finger scroll it: from the top while it fits, and when it does not, to its
 *  foot, where the two commands are. A reversed column is a scroller that starts
 *  at its end; the spacer first in it takes whatever room the card leaves, so a
 *  card that fits stands at the top. Scrolled, the name moves into the bar
 *  (contacts-app.css). */
function ImportSheet({ card, pressed }: { card: VCard; pressed: boolean }) {
  return (
    <>
      <div className="absolute inset-x-(--ag-contacts-behind-x) top-(--ag-contacts-behind-top) bottom-0 rounded-t-(--ag-contacts-behind-radius) bg-(--ag-contacts-behind)" />
      <div
        data-slot="contacts-app-sheet"
        className="absolute inset-x-0 top-(--ag-contacts-sheet-top) bottom-0 overflow-hidden rounded-t-(--ag-contacts-sheet-radius) bg-(--ag-contacts-ground)"
      >
        <div
          data-slot="contacts-app-scroller"
          className="flex h-full flex-col-reverse overflow-hidden"
        >
          <div className="grow" />
          <div className="flex shrink-0 flex-col gap-(--ag-contacts-gap) pt-(--ag-contacts-head-sheet) pb-(--ag-contacts-foot)">
            <Header card={card} />
            <Fields card={card} />
            <Commands
              rows={["Create New Contact", "Add to Existing Contact"]}
              lit={pressed ? "Create New Contact" : undefined}
            />
          </div>
        </div>
        <ScrollEdge head="h-(--ag-contacts-head-sheet)" />
        <div
          data-slot="contacts-app-nav"
          className="absolute inset-x-(--ag-contacts-margin) top-(--ag-contacts-sheet-bar-top) flex h-(--ag-contacts-bar) items-center"
        >
          <div className={cn(GLASS, "w-(--ag-contacts-bar) shrink-0")}>
            <X className="size-(--ag-contacts-close)" strokeWidth={2.4} />
          </div>
          <div
            data-slot="contacts-app-title"
            className={cn(
              BODY,
              "min-w-0 flex-1 truncate pr-(--ag-contacts-title-x) pl-(--ag-contacts-margin) text-center font-semibold text-(--ag-contacts-label)",
            )}
          >
            {card.name}
          </div>
        </div>
      </div>
    </>
  )
}

function ContactPage({ card }: { card: VCard }) {
  const commands = [
    ...(card.phones.length > 0 ? ["Send Message"] : []),
    "Share Contact",
    "Add to Favorites",
  ]
  return (
    <>
      <div className="flex flex-col gap-(--ag-contacts-gap) pt-(--ag-contacts-head-page) pb-(--ag-contacts-foot)">
        <Header card={card} />
        <Fields card={card} />
        <Commands rows={commands} />
      </div>
      <ScrollEdge head="h-(--ag-contacts-head-page)" />
      <div
        data-slot="contacts-app-nav"
        className={cn(
          BODY,
          "absolute inset-x-(--ag-contacts-margin) top-(--ag-contacts-safe-top) flex items-center justify-between",
        )}
      >
        <div
          className={cn(
            GLASS,
            "pr-(--ag-contacts-bar-x) pl-(--ag-contacts-back-x)",
          )}
        >
          <ChevronLeft
            className="size-(--ag-contacts-chevron)"
            strokeWidth={2.6}
          />
          Contacts
        </div>
        <div className={cn(GLASS, "px-(--ag-contacts-bar-x)")}>Edit</div>
      </div>
    </>
  )
}

/** What the picture shows, said in words. */
function describe(card: VCard, view: ContactsAppView, pressed: boolean) {
  const has = [
    card.phones.length > 0 && "a phone number",
    card.emails.length > 0 && "an email",
    card.urls.length > 0 && "a link",
    card.addresses.length > 0 && "an address",
    card.note && "a note",
  ].filter(Boolean)
  const holding = has.length > 0 ? `, with ${has.join(", ")}` : ""
  return view === "import"
    ? `iPhone, a contact file opened: ${card.name}${holding}, offering Create New Contact${pressed ? ", pressed" : ""} or Add to Existing Contact`
    : `iPhone Contacts: the card of ${card.name}${holding}`
}

export function ContactsApp({
  vcard,
  view,
  pressed = false,
  scheme = "dark",
  className,
}: {
  /** The .vcf's text (lib/vcard-core reads it). */
  vcard: string
  /** `import`: the sheet iOS raises over a just-opened .vcf. `contact`: the saved
   *  card in the Contacts app. */
  view: ContactsAppView
  /** `import` only: Create New Contact lit under a finger. */
  pressed?: boolean
  /** iOS's appearance. */
  scheme?: ContactsAppScheme
  className?: string
}) {
  if (pressed && view !== "import")
    throw new Error(
      "contacts-app: `pressed` is the import sheet's, not the card's",
    )
  const card = parseVcard(vcard)
  const palette = PALETTE[scheme][view === "import" ? "sheet" : "page"]
  const clash = Object.keys(palette).find((k) => k in PT)
  if (clash)
    throw new Error(
      `contacts-app: --ag-contacts-${clash} is a size and a colour`,
    )
  const vars = {
    ...Object.fromEntries(
      Object.entries(PT).map(([k, v]) => [`--ag-contacts-${k}`, cqw(v)]),
    ),
    ...Object.fromEntries(
      Object.entries(palette).map(([k, v]) => [`--ag-contacts-${k}`, v]),
    ),
    "--ag-contacts-behind": BEHIND[scheme],
  } as React.CSSProperties
  return (
    <div
      role="img"
      aria-label={describe(card, view, pressed)}
      data-slot="contacts-app"
      data-view={view}
      data-scheme={scheme}
      className={cn(
        "@container absolute inset-0 overflow-hidden font-[family-name:-apple-system,BlinkMacSystemFont,system-ui,sans-serif] antialiased select-none",
        view === "import" ? "bg-black" : "bg-(--ag-contacts-ground)",
        className,
      )}
      style={vars}
    >
      <div aria-hidden className="absolute inset-0">
        {view === "import" ? (
          <ImportSheet card={card} pressed={pressed} />
        ) : (
          <ContactPage card={card} />
        )}
        <HomeIndicator />
      </div>
    </div>
  )
}
