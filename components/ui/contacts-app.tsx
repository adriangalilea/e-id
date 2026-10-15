import {
  Check,
  ChevronLeft,
  CircleUser,
  Clock,
  Compass,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Share,
  Video,
  X,
} from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"
import {
  parseVcard,
  type VCard,
  type VCardField,
} from "@/lib/vcard-core"
import { Image } from "@/components/ui/image"
import { glassVariants } from "@/components/ui/material-glass"
import "./contacts-app.css"

// APPLE'S CONTACTS APP ON AN IPHONE (iOS 26), drawn from a vCard (lib/vcard-core):
// a picture of the app, never the app. iOS 26 sets a contact on a poster in the
// colour of its photo: the screen that colour, everything on it white, the
// controls liquid glass. Three screens: `preview`, the sheet iOS 26 raises when a
// .vcf is opened from Safari (done, a blue ✓, and share in glass, the face large,
// its name and nickname, the fields; ✓ saves it); `import`, the sheet as iOS drew it
// before (the card, then Create New Contact and Add to Existing Contact; `pressed`
// lights the first, the instant before it saves); and `contact`, the saved card in
// Contacts (the back chevron and Edit in glass, the face, the name, the four glass
// actions dimmed where the card has no channel for them, each kind of field its
// own group with its glyph at the end, the tab bar at the foot). `preview` and
// `contact` scroll (`scroll`, 0 the top to 1 the foot), for a story's scroll to
// drive.
//
// The poster's colour comes from the photo's `average` (prepare-media measures it:
// a prepared picture's `average`, or `averageOf` on bytes fetched at request
// time), passed in, since a picture rendered on the server holds no pixels to read
// it from. Its hue and saturation are kept and its lightness settled where white
// reads (`settle`), so a grey photo gives a grey poster, as a quote's ground does
// (quote-card, `toneFrom`). It fills the positioned box it is put in, an
// `IphoneFrame`'s screen, and lays out in that box's own width: every length is an
// iOS point as cqw of a 402 pt screen (iPhone 16 Pro). The status bar and the
// island are the frame's; their ink and the ground under them come from
// `contactsAppScreen`. One `role="img"`, its insides hidden from assistive tech. No
// state: it renders on the server.
//
//   <IphoneFrame style={contactsAppScreen("contact", average)}>
//     <ContactsApp vcard={vcfText} view="contact" average={average} />
//   </IphoneFrame>

export type ContactsAppView = "preview" | "import" | "contact"

/** A screen that is a sheet raised over another app: black round it. */
const sheet = (view: ContactsAppView) => view !== "contact"

/** The poster's colour where none is given: iOS's own for a contact with no
 *  photo, a cool grey. */
const NO_PHOTO = "#7c8494"

/** The iPhone 16 Pro's screen width in points: every length below is a share of it. */
const SCREEN_PT = 402
const cqw = (pt: number) => `${((pt * 100) / SCREEN_PT).toFixed(3)}cqw`

/** iOS 26's metrics, in points. */
const PT = {
  // Safe areas: the status bar's band, the home indicator's.
  "safe-top": 62,
  "safe-bottom": 34,
  // Grouped rows: the side margin (also a row's text inset and the separator's),
  // a row's vertical padding, a group's corner, the gap between groups, the
  // glyph at a row's end.
  margin: 16,
  "row-y": 13,
  radius: 22,
  gap: 14,
  trail: 21,
  // A bar's glass button, a capsule or a circle this tall; its glyphs.
  bar: 48,
  "bar-x": 18,
  chevron: 26,
  close: 20,
  // The header: the photo, its monogram, the name, the line under it.
  photo: 186,
  monogram: 72,
  "photo-gap": 20,
  title: 34,
  "title-leading": 40,
  // The four glass actions: a circle, its glyph, the gap between.
  action: 62,
  icon: 26,
  "action-gap": 12,
  "head-gap": 22,
  // A row's two lines: the label, the value.
  label: 16,
  "label-leading": 21,
  value: 19,
  "value-leading": 24,
  sub: 17,
  "sub-leading": 22,
  // The tab bar: its height, how far it stands off the foot and the sides, the
  // search circle beside it, a tab's glyph and word.
  tab: 64,
  "tab-bottom": 26,
  "tab-gap": 10,
  "tab-icon": 26,
  "tab-word": 11,
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
}

/** Where a card at rest starts: under the page's bar, or under the sheet's. */
const HEAD = {
  page: PT["safe-top"] + PT.bar + 18,
  sheet: PT["sheet-bar-top"] + PT.bar + 18,
}

/** The room after the last group: the tab bar and its gap on the page, the home
 *  indicator's band on the sheet. */
const FOOT = {
  page: PT.tab + PT["tab-bottom"] + PT.gap,
  sheet: PT["safe-bottom"] + PT.gap,
}

/** Any colour as the poster can carry it: everything on the poster is white, so
 *  its lightness is held where white reads on it (OKLCH 0.40 to 0.56) and its
 *  chroma muted as iOS mutes a photo's (at most 0.12), its hue kept. A bright sky
 *  or a pale wall comes out the same colour, deep enough. */
const settle = (tint: string) =>
  `oklch(from ${tint} clamp(0.4, l, 0.56) min(c, 0.12) h)`

/** The poster's top, a touch lighter: what the status bar stands on. */
const topOf = (tint: string) =>
  `color-mix(in oklab, ${settle(tint)}, white 10%)`

/** The poster's ground from its colour: a touch lighter at the top, a touch
 *  deeper at the foot, as iOS washes a photo's colour down the screen. */
const posterOf = (tint: string) =>
  `linear-gradient(180deg, ${topOf(tint)}, ${settle(tint)} 45%, color-mix(in oklab, ${settle(tint)}, black 22%))`

/** What the frame draws outside this box, for the frame's `style`: the status
 *  bar's ink (white over the poster, and over a sheet's black surround) and the
 *  screen's ground under it, the poster's top. */
export function contactsAppScreen(
  view: ContactsAppView,
  average: string = NO_PHOTO,
): React.CSSProperties {
  return {
    "--device-status-ink": "#fff",
    "--device-screen-background": sheet(view) ? "#000" : topOf(average),
  } as React.CSSProperties
}

type Kind = "phone" | "email" | "url" | "address"

/** The glyph at the end of a row, by what it is: call, write, open, find. */
const TRAIL: Record<Kind, typeof Phone> = {
  phone: Phone,
  email: Mail,
  url: Compass,
  address: MapPin,
}

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

/** Liquid glass on the poster: the one material (material-glass), dark so its
 *  words are white, its face a breath of white over the blur, as iOS's controls
 *  stand on a poster. Each use states its corner, half its height. */
const GLASS = cn(
  glassVariants({ shape: "surface", scheme: "dark" }),
  "flex items-center justify-center text-white [--glass-tint:rgb(255_255_255/0.14)]",
)
/** A bar's round glass button: back, close. */
const BAR_CIRCLE =
  "size-(--ag-contacts-bar) [--glass-radius:calc(var(--ag-contacts-bar)/2)]"
/** A group of rows: a lighter wash of the poster, rounded. */
const GROUP =
  "mx-(--ag-contacts-margin) overflow-hidden rounded-(--ag-contacts-radius) bg-white/[0.14]"
/** A row after the first carries the hairline above it, inset to the text. */
const ROW =
  "relative flex items-center gap-(--ag-contacts-margin) px-(--ag-contacts-margin) py-(--ag-contacts-row-y) not-first:before:absolute not-first:before:top-0 not-first:before:right-(--ag-contacts-margin) not-first:before:left-(--ag-contacts-margin) not-first:before:h-px not-first:before:bg-white/20 not-first:before:content-['']"
const LABEL =
  "text-(length:--ag-contacts-label) leading-(--ag-contacts-label-leading) text-white"
const VALUE =
  "text-(length:--ag-contacts-value) leading-(--ag-contacts-value-leading) text-white"

function Field({ kind, field }: { kind: Kind; field: VCardField }) {
  const Trail = TRAIL[kind]
  return (
    <div data-slot="contacts-app-row" className={ROW}>
      <div className="min-w-0 flex-1">
        <div className={LABEL}>{labelOf(field)}</div>
        <div className={cn(VALUE, "break-words")}>{field.value}</div>
      </div>
      <Trail
        className="size-(--ag-contacts-trail) shrink-0 text-white"
        strokeWidth={2}
      />
    </div>
  )
}

/** One group per kind of field, in the order the card lists them. */
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
            <div className="min-w-0 flex-1">
              <div className={LABEL}>notes</div>
              <div className={cn(VALUE, "whitespace-pre-line break-words")}>
                {card.note}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** A group of one-line commands, `lit` the row under a finger. */
function Commands({ rows, lit }: { rows: string[]; lit?: string }) {
  return (
    <div data-slot="contacts-app-section" className={GROUP}>
      {rows.map((row) => (
        <div
          key={row}
          data-slot="contacts-app-row"
          data-pressed={row === lit ? "" : undefined}
          className={cn(ROW, VALUE, "data-pressed:bg-white/20")}
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
  return (
    <div className="flex flex-col items-center">
      <div
        data-slot="contacts-app-photo"
        className="grid size-(--ag-contacts-photo) shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 font-semibold text-(length:--ag-contacts-monogram) text-white"
      >
        {card.photo ? (
          <Image src={card.photo} alt="" className="size-full object-cover" />
        ) : (
          initials(card.name)
        )}
      </div>
      <div className="mt-(--ag-contacts-photo-gap) px-(--ag-contacts-margin) text-center font-bold text-(length:--ag-contacts-title) leading-(--ag-contacts-title-leading) tracking-[-0.01em] text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.18)]">
        {card.name}
      </div>
      {/* The line under the name: the company, else the nickname, as iOS 26's
          poster sets it. */}
      {(card.org ?? card.nickname) && (
        <div className="px-(--ag-contacts-margin) text-center font-semibold text-(length:--ag-contacts-sub) leading-(--ag-contacts-sub-leading) text-white">
          {card.org ?? card.nickname}
        </div>
      )}
      <div
        data-slot="contacts-app-actions"
        className="mt-(--ag-contacts-head-gap) flex justify-center gap-(--ag-contacts-action-gap)"
      >
        {channelsOf(card).map(({ name, Icon, on }) => (
          <div
            key={name}
            data-on={on ? "" : undefined}
            className={cn(
              GLASS,
              "size-(--ag-contacts-action) [--glass-radius:calc(var(--ag-contacts-action)/2)] *:col-start-1 *:row-start-1",
              // Off, the glyph is the poster's colour lifted, opaque: dimmed,
              // never see-through.
              "grid text-(--ag-contacts-off) data-on:text-white",
            )}
          >
            <Icon
              className="size-(--ag-contacts-icon)"
              fill="currentColor"
              strokeWidth={1.4}
            />
            {name === "mail" && (
              // The flap cut out of the filled envelope, as SF's envelope.fill:
              // lucide draws its body over the flap, so the flap is drawn again
              // alone, on top, in the poster's colour.
              <Mail
                className="size-(--ag-contacts-icon) text-(--ag-contacts-tint) [&>rect]:hidden"
                strokeWidth={1.6}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** iOS 26's scroll edge: the poster fading in under a bar's glass, so what has
 *  scrolled up passes softly beneath the buttons. */
function ScrollEdge({ head }: { head: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-(--ag-contacts-top) from-45% to-transparent",
        head,
      )}
    />
  )
}

/** The keypad's glyph, SF's circle.grid.3x3.fill: three rows of three dots. */
function Keypad({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      {[4, 12, 20].flatMap((y) =>
        [4, 12, 20].map((x) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={2.6} />
        )),
      )}
    </svg>
  )
}

/** The tab bar at the foot, glass: Calls, Contacts (the one open, lit), Keypad;
 *  search a glass circle of its own beside it. */
function TabBar() {
  const tabs = [
    { word: "Calls", Icon: Clock },
    { word: "Contacts", Icon: CircleUser, open: true },
    { word: "Keypad", Icon: Keypad },
  ]
  return (
    <div className="absolute inset-x-(--ag-contacts-margin) bottom-(--ag-contacts-tab-bottom) flex h-(--ag-contacts-tab) gap-(--ag-contacts-tab-gap)">
      <div
        className={cn(
          GLASS,
          "flex-1 gap-0 p-[0.6cqw] [--glass-radius:calc(var(--ag-contacts-tab)/2)]",
        )}
      >
        {tabs.map(({ word, Icon, open }) => (
          <div
            key={word}
            className={cn(
              "flex h-full flex-1 flex-col items-center justify-center gap-[0.6cqw] rounded-full",
              open && "bg-white/[0.18]",
            )}
          >
            <Icon className="size-(--ag-contacts-tab-icon)" strokeWidth={2.2} />
            <span className="font-semibold text-(length:--ag-contacts-tab-word) leading-none">
              {word}
            </span>
          </div>
        ))}
      </div>
      <div
        className={cn(
          GLASS,
          "aspect-square h-full [--glass-radius:calc(var(--ag-contacts-tab)/2)]",
        )}
      >
        <Search className="size-(--ag-contacts-tab-icon)" strokeWidth={2.4} />
      </div>
    </div>
  )
}

function HomeIndicator() {
  return (
    <div className="absolute bottom-(--ag-contacts-home-bottom) left-1/2 h-(--ag-contacts-home-h) w-(--ag-contacts-home) -translate-x-1/2 rounded-full bg-white" />
  )
}

/** The sheet over the screen it was raised from, on the same poster. Its card
 *  scrolls as iOS lets a finger scroll it: from the top while it fits, and when
 *  it does not, to its foot, where the two commands are. A reversed column is a
 *  scroller that starts at its end; the spacer first in it takes whatever room
 *  the card leaves, so a card that fits stands at the top. Scrolled, the name
 *  moves into the bar (contacts-app.css). */
function ImportSheet({ card, pressed }: { card: VCard; pressed: boolean }) {
  return (
    <>
      <div className="absolute inset-x-(--ag-contacts-behind-x) top-(--ag-contacts-behind-top) bottom-0 rounded-t-(--ag-contacts-behind-radius) bg-[#2a2a2e]" />
      <div
        data-slot="contacts-app-sheet"
        // Its top corners cut by a path, never `overflow-hidden`: a clip with
        // uneven corners makes Chrome drop the masks of the glass inside it
        // (device-frame.css, the display).
        className="absolute inset-x-0 top-(--ag-contacts-sheet-top) bottom-0 rounded-t-(--ag-contacts-sheet-radius) bg-(image:--ag-contacts-poster) [clip-path:inset(0_round_var(--ag-contacts-sheet-radius)_var(--ag-contacts-sheet-radius)_0_0)]"
      >
        <div
          data-slot="contacts-app-scroller"
          className="flex h-full flex-col-reverse overflow-hidden"
        >
          <div className="grow" />
          <div
            className="flex shrink-0 flex-col gap-(--ag-contacts-gap)"
            style={{
              paddingTop: cqw(HEAD.sheet),
              paddingBottom: cqw(FOOT.sheet),
            }}
          >
            <Header card={card} />
            <Fields card={card} />
            <Commands
              rows={["Create New Contact", "Add to Existing Contact"]}
              lit={pressed ? "Create New Contact" : undefined}
            />
          </div>
        </div>
        <ScrollEdge head="h-[var(--ag-contacts-head-sheet)]" />
        <div
          data-slot="contacts-app-nav"
          className="absolute inset-x-(--ag-contacts-margin) top-(--ag-contacts-sheet-bar-top) flex h-(--ag-contacts-bar) items-center"
        >
          <div className={cn(GLASS, BAR_CIRCLE, "shrink-0")}>
            <X className="size-(--ag-contacts-close)" strokeWidth={2.6} />
          </div>
          <div
            data-slot="contacts-app-title"
            className={cn(
              VALUE,
              "min-w-0 flex-1 truncate px-(--ag-contacts-margin) text-center font-semibold",
            )}
            style={{ paddingRight: cqw(PT.bar + PT.margin) }}
          >
            {card.name}
          </div>
        </div>
      </div>
    </>
  )
}

/** A card's column scrolled `scroll` of the way through its box, with no
 *  measuring: placed that share down the box and lifted that share of its own
 *  height, its top meets the box's at 0 and its foot the box's at 1. A column no
 *  taller than the box fills it and never moves. */
function Scrolled({
  scroll,
  head,
  foot,
  children,
}: {
  scroll: number
  /** The room above it and after it, iOS points. */
  head: number
  foot: number
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="contacts-app-card"
      className="absolute inset-x-0 flex min-h-full flex-col gap-(--ag-contacts-gap)"
      style={{
        top: `${scroll * 100}%`,
        transform: `translateY(${-scroll * 100}%)`,
        paddingTop: cqw(head),
        paddingBottom: cqw(foot),
      }}
    >
      {children}
    </div>
  )
}

/** The face in iOS 26's preview sheet: larger than in Contacts, the sheet's
 *  width nearly. */
const PREVIEW_PHOTO = 236

/** iOS 26's sheet over Safari when a .vcf is opened: the card on its poster,
 *  done (a blue ✓, which saves it) and share in glass at its top, no commands
 *  under the card. Scrolled with `scroll`. */
function PreviewSheet({ card, scroll }: { card: VCard; scroll: number }) {
  return (
    <div
      data-slot="contacts-app-sheet"
      // Its top corners cut by a path, never `overflow-hidden` (ImportSheet).
      className="absolute inset-x-0 top-(--ag-contacts-sheet-top) bottom-0 rounded-t-(--ag-contacts-sheet-radius) bg-(image:--ag-contacts-poster) [clip-path:inset(0_round_var(--ag-contacts-sheet-radius)_var(--ag-contacts-sheet-radius)_0_0)]"
      style={
        { "--ag-contacts-photo": cqw(PREVIEW_PHOTO) } as React.CSSProperties
      }
    >
      <Scrolled scroll={scroll} head={HEAD.sheet} foot={FOOT.sheet}>
        <Header card={card} />
        <Fields card={card} />
      </Scrolled>
      <ScrollEdge head="h-[var(--ag-contacts-head-sheet)]" />
      <div
        data-slot="contacts-app-nav"
        className="absolute inset-x-(--ag-contacts-margin) top-(--ag-contacts-sheet-bar-top) flex h-(--ag-contacts-bar) items-center justify-between"
      >
        <div
          className={cn(
            GLASS,
            BAR_CIRCLE,
            "[--glass-tint:rgb(10_132_255/0.92)]",
          )}
        >
          <Check className="size-(--ag-contacts-chevron)" strokeWidth={3} />
        </div>
        <div className={cn(GLASS, BAR_CIRCLE)}>
          <Share className="size-(--ag-contacts-close)" strokeWidth={2.4} />
        </div>
      </div>
    </div>
  )
}

function ContactPage({ card, scroll }: { card: VCard; scroll: number }) {
  const commands = [
    ...(card.phones.length > 0 ? ["Send Message"] : []),
    "Share Contact",
    "Add to Favorites",
  ]
  return (
    <>
      <Scrolled scroll={scroll} head={HEAD.page} foot={FOOT.page}>
        <Header card={card} />
        <Fields card={card} />
        <Commands rows={commands} />
      </Scrolled>
      <ScrollEdge head="h-[var(--ag-contacts-head-page)]" />
      <div
        data-slot="contacts-app-nav"
        className={cn(
          VALUE,
          "absolute inset-x-(--ag-contacts-margin) top-(--ag-contacts-safe-top) flex h-(--ag-contacts-bar) items-center justify-between",
        )}
      >
        <div className={cn(GLASS, BAR_CIRCLE)}>
          <ChevronLeft
            className="size-(--ag-contacts-chevron)"
            strokeWidth={2.8}
          />
        </div>
        <div
          className={cn(
            GLASS,
            "h-full px-(--ag-contacts-bar-x) font-semibold [--glass-radius:calc(var(--ag-contacts-bar)/2)]",
          )}
        >
          Edit
        </div>
      </div>
      <TabBar />
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
  switch (view) {
    case "preview":
      return `iPhone, a contact file opened from Safari: ${card.name}${holding}, to save with done`
    case "import":
      return `iPhone, a contact file opened: ${card.name}${holding}, offering Create New Contact${pressed ? ", pressed" : ""} or Add to Existing Contact`
    case "contact":
      return `iPhone Contacts: the card of ${card.name}${holding}`
  }
}

export function ContactsApp({
  vcard,
  view,
  pressed = false,
  scroll = 0,
  average = NO_PHOTO,
  className,
}: {
  /** The .vcf's text (lib/vcard-core reads it). */
  vcard: string
  /** `preview`: the sheet iOS 26 raises over Safari for a just-opened .vcf.
   *  `import`: that sheet as iOS drew it before. `contact`: the saved card in the
   *  Contacts app. */
  view: ContactsAppView
  /** `import` only: Create New Contact lit under a finger. */
  pressed?: boolean
  /** `preview` and `contact`: how far the card is scrolled, 0 its top to 1 its
   *  foot (a story's scroll driving it). */
  scroll?: number
  /** The photo's mean colour (prepare-media's `average`, or `averageOf` on its
   *  bytes), the poster's colour; iOS's grey for a card with no photo. */
  average?: string
  className?: string
}) {
  if (pressed && view !== "import")
    throw new Error(
      "contacts-app: `pressed` is the import sheet's, not the card's",
    )
  if (scroll !== 0 && view === "import")
    throw new Error(
      "contacts-app: the import sheet rests at its foot; `scroll` is the preview's and the card's",
    )
  if (scroll < 0 || scroll > 1)
    throw new Error(`contacts-app: \`scroll\` is 0..1, got ${scroll}`)
  const card = parseVcard(vcard)
  const vars = {
    ...Object.fromEntries(
      Object.entries(PT).map(([k, v]) => [`--ag-contacts-${k}`, cqw(v)]),
    ),
    "--ag-contacts-head-page": cqw(HEAD.page),
    "--ag-contacts-head-sheet": cqw(HEAD.sheet),
    "--ag-contacts-tint": settle(average),
    "--ag-contacts-top": topOf(average),
    "--ag-contacts-off": `color-mix(in oklab, ${settle(average)}, white 38%)`,
    "--ag-contacts-poster": posterOf(average),
  } as React.CSSProperties
  return (
    <div
      role="img"
      aria-label={describe(card, view, pressed)}
      data-slot="contacts-app"
      data-view={view}
      className={cn(
        "@container absolute inset-0 overflow-hidden font-[family-name:-apple-system,BlinkMacSystemFont,system-ui,sans-serif] antialiased select-none",
        sheet(view) ? "bg-black" : "bg-(image:--ag-contacts-poster)",
        className,
      )}
      style={vars}
    >
      <div aria-hidden className="absolute inset-0">
        {view === "preview" ? (
          <PreviewSheet card={card} scroll={scroll} />
        ) : view === "import" ? (
          <ImportSheet card={card} pressed={pressed} />
        ) : (
          <ContactPage card={card} scroll={scroll} />
        )}
        <HomeIndicator />
      </div>
    </div>
  )
}
