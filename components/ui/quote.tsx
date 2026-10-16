// Somebody else's words, on the page, at THREE WEIGHTS — and every one of them reads its
// numbers from `quote-card`, the same module that draws the social preview, so there is
// nothing to keep in sync by hand and nothing that can drift when either is touched.
//
//   card     the poster: the portrait bleeding out of the right edge, the ghost mark, the
//            words composed in the band. It IS the link preview, drawn in the DOM.
//   feature  the page's own weight: no frame, no portrait — the mark, the words set at
//            display size over it, one line of attribution. What a quote's own page opens
//            with, and the step the other two left missing.
//   prose    a quotation inside an article, at the page's own type, marked by a small
//            mark rather than a rule. What an embed in a feed card is.
//
// WHAT THE THREE CANNOT SHARE WITH THE STILL is measurement. A browser knows exactly how
// wide a character is and the still has no way to find out, so the still estimates `ch`
// and these state the measure in real `ch` and let the layout engine be right. They agree
// on how many characters a line carries; they may disagree about which word ends one.
//
// It renders a real `<blockquote>` with a real `<cite>`, because that is what this is,
// and a screen reader announcing "blockquote" is information the styling cannot carry.
//
// STYLE IS UTILITIES IN THE JSX, merged with `cn` and `className` last, the way every
// shadcn item is, so a consumer overrides a padding by passing a class and never fights
// a stylesheet. The numbers that are not fixed values — everything the card and the
// feature derive from the module's constants (cqw sizes, shares of the frame, the focus
// gradient, the dissolve mask) — arrive as custom properties on `style` and LAND through
// `-(--…)` utilities: `w-(--ag-quote-column)`, `text-(length:--ag-quote-size)`. The
// property is the seam between the arithmetic and the CSS; the class says which
// property each number drives. There is no quote.css.

import { Avatar } from "@/components/ui/avatar"
import { AvatarPortrait } from "@/components/ui/avatar-portrait"
import { Image } from "@/components/ui/image"
import type { Material, Scheme } from "@/components/ui/material"
import { QuoteMarkMask } from "@/components/ui/quote-mark"
import { QuoteSurface } from "@/components/ui/quote-surface"
import {
  ATTRIB_GAP,
  assert,
  BLOCK_AT,
  CAP,
  CARD_H,
  CARD_W,
  DATE_EM,
  DESC,
  DISSOLVE,
  EDGE,
  FACE_FEATHER,
  FACE_SHARE,
  FEATURE_MEASURE,
  FOCUS,
  GLOW,
  GROUND,
  glowOf,
  grainLayer,
  INDENT,
  LINE,
  MARGIN,
  MARK_BLUR,
  MARK_BOX,
  MARK_EM,
  MARK_OPACITY,
  NAME_EM,
  QUOTE_CH,
  type Quote as QuoteData,
  type QuoteTone,
  quoteClean,
  quoteMeasure,
  quoteSet,
  SIZE_MAX,
} from "@/lib/quote-card"
import { cn } from "@/lib/utils"

export type QuoteVariant = "card" | "feature" | "prose"

export interface QuoteProps extends QuoteData {
  /** Which weight. Defaults to `prose`, the one that shouts least. */
  variant?: QuoteVariant
  /** The picture's own colour, ground and ink. Derived from the pixels by whoever has
   *  them (`toneFrom`); without it the card is neutral, which is honest — a hue from a
   *  hash of the author's name is a colour nobody chose, and it lands wherever the hash
   *  lands. */
  tone?: QuoteTone
  /** Where the subject sits across the portrait, 0 to 1, so the card's dissolve does
   *  not eat it. Same number the still takes, from the same detector. */
  focus?: number
  /** The width the measure is set against, in px. For `card` and `feature`, and only
   *  worth passing when the quote is not in the usual reading column.
   *
   *  `source` is drawn in `feature` and `prose`, never on the card: the still has
   *  nowhere to put a link, and the card matching its own preview outranks carrying one
   *  more affordance. */
  width?: number
  /** The page's serif's average character advance, as a share of the em — see QUOTE_CH.
   *  The browser wraps in real `ch`, so this only decides the SIZE; leave it and a
   *  condensed face is set a third too small for its measure. Pass the same number the
   *  still gets, so the page and the preview set the same type. */
  ch?: number
  /** The surface `prose` and `feature` stand on: plain, one step up from the page, or
   *  the one glass material (`QuoteSurface`); default the nearest MaterialProvider's.
   *  The card has no glass face: it is its own link preview, drawn in the DOM, and a
   *  card in glass would be a card its preview does not match. Asked for one, it
   *  throws. */
  material?: Material
  /** The colour scheme the surface stands in (material). */
  scheme?: Scheme
  className?: string
  children?: React.ReactNode
}

/** The reading column a quote is set for, matching the site's `max-w-3xl`. */
export const QUOTE_WIDTH = 768

const pct = (n: number) => `${(n * 100).toFixed(3)}%`
/** A hundredth of the CONTAINER's width, whatever property it lands on. `%` means that
 *  only for horizontal offsets and widths; everywhere else it means something surprising
 *  — as font-size it is the parent's font-size, as an abspos height the container's
 *  height. */
const cqw = (n: number) => `${(n * 100).toFixed(3)}cqw`

const unit = 1 / 150
const aspect = CARD_W / CARD_H

/** THE MARK SCALES WITH THE WEIGHT. At the card's size it is a ghost in the picture's
 *  colour and belongs to the picture; the feature has no picture, so at that size and
 *  blur it is a smear behind the first line. Half the height, a quarter of the blur, a
 *  shade fainter: a mark that says "quotation" and then gets out of the way. */
const FEATURE_MARK = 0.5
const FEATURE_BLUR = 0.25
const FEATURE_FILL = 0.8
/** THE WORDS CLIMB INTO THE MARK. No band to centre them in, so they start half way
 *  down it: the overlap is what gives the card depth, and hanging them below the mark
 *  reads as two objects stacked. */
const FEATURE_CLIMB = 0.25

/** The words are a QUOTATION and take a reading serif: `--font-quote` (tokens) names
 *  the face, the same slot the still fills with its `fontFamily`. NOT `--font-serif`: a
 *  page's serif is usually its heading face, and a display serif drawn for headlines
 *  (Instrument Serif on adriangalilea.com) was illegible at reading size the moment the
 *  quote inherited it. */
const WORDS = "m-0 font-quote *:m-0 [&>p+p]:mt-2"
/** The attribution line: one row, the page's muted voice, never italic (a figcaption is
 *  not a caption in the typographic sense here). */
const BY = "flex items-center not-italic text-muted-foreground"
/** The name is a NAME. Colouring it makes the accent mean "person", which it does not
 *  mean anywhere else, and pulls the eye off the sentence. */
const NAME = "font-sans not-italic text-foreground/75"
const LINK = "text-inherit no-underline hover:underline"
/** THREE VOICES: the words are a quotation, the name is a person, the date is metadata.
 *  The still draws the same three; a card disagreeing with its own preview about which
 *  is which is the drift the shared module exists to prevent. */
const META = "font-mono text-muted-foreground/80"
/** THE MEASURE IS THE RULE, in real `ch`: the browser knows how wide a character of this
 *  face is and the still can only estimate. Both carry the same characters a line, and
 *  both BALANCE: `quoteWrap` is `text-wrap: balance` written out, so the card's lines
 *  fall the way the still's do rather than greedy-with-a-tidy-rag (`pretty`). */
const MEASURED = "*:max-w-(--ag-quote-measure) *:text-balance"

export function Quote({
  text,
  author,
  source,
  date,
  variant = "prose",
  tone,
  focus = FOCUS,
  width = QUOTE_WIDTH,
  ch = QUOTE_CH,
  material,
  scheme,
  className,
  children,
}: QuoteProps) {
  const words = quoteClean(text)
  const body = children ?? <p>{words}</p>
  const ink = tone?.accent ?? "currentColor"

  // THE SAME LEFT EDGE AT EVERY WEIGHT: the mark and the attribution hang from the
  // margin, and only the words step in from it. The padding IS the margin the glyph sits
  // at; the words carry the indent themselves.
  //
  // AT THIS SCALE THE MARK IS A GLYPH, NOT A GHOST. The card's mark is a big soft shape
  // the words climb over, and that only works with a block of words to climb; behind a
  // single line it read as a smudge under the first word at any size that was tried. So
  // it does what an opening quotation mark does in a book: it sits in the gutter to the
  // left of the first line, cap-high, sharp, and the words start after it. Not fainter —
  // faint at this size is dirt; small and clean is a mark.
  //
  // ONE STEP UP IN SIZE from the page's type. A serif set at the body size reads smaller
  // than the sans around it (a lower x-height, finer strokes), and a display serif on a
  // dark ground reads smaller still, so one step up is what keeps the quote legible in
  // an article. The mark, sized in em, scales with it; the attribution is metadata and
  // keeps the metadata size.
  // EVERY SIZE IN EM of the quote's own type, which is one step up from the page's
  // (1.125em): the same quote in an article and in a page set small (a file's face) is
  // one quote made small, never a small quote in a large frame. At a 16 px page it is
  // the 18 px quote with 16 px padding it was drawn as.
  if (variant === "prose")
    return (
      <QuoteSurface
        variant="prose"
        material={material}
        scheme={scheme}
        className={cn(
          "relative m-0 py-[0.889em] pr-[1.111em] pl-[0.8em] text-[1.125em]",
          className,
        )}
        style={{ "--ag-quote-ink": ink } as React.CSSProperties}
      >
        <Mark className="left-[0.8em] top-[1.089em] h-[0.95em] opacity-30" />
        <blockquote
          data-slot="quote-body"
          className={cn(WORDS, "ms-[1.2em] text-foreground/92")}
        >
          {body}
        </blockquote>
        <By
          className={cn(BY, "mt-[0.667em] gap-[0.444em] text-[0.667em]")}
          author={author}
          date={date}
          source={source}
          tone={tone}
          focus={focus}
          face="sm"
        />
      </QuoteSurface>
    )

  if (variant === "feature") {
    // The words are set in from the left by the still's INDENT and the mark sits at the
    // margin the words are indented FROM, so the two stack the way they do on the card —
    // the overlap is the depth. No band to centre in: the block flows, and it starts
    // half way down the mark so the words climb into it rather than hang below it.
    const column = 1 - unit * INDENT
    const { size } = quoteSet(words, width * column, {
      ch,
      measure: FEATURE_MEASURE,
      sizeMax: (width / aspect) * SIZE_MAX,
    })
    // A container, so the mark and the type scale with the column they are actually in.
    // THE WORDS ARE THE INDENTED THING: the mark and the attribution hang from the
    // margin, exactly as on the card, and only the quotation steps in from it. Indenting
    // the attribution along with them put the avatar under the first letter instead of
    // under the mark, and the composition lost its left edge.
    const mark = MARK_EM / aspect
    return (
      <QuoteSurface
        variant="feature"
        material={material}
        scheme={scheme}
        className={cn("relative m-0 @container px-8 py-6", className)}
        style={
          {
            "--ag-quote-ink": ink,
            "--ag-quote-indent": pct(unit * INDENT),
            "--ag-quote-measure": `${quoteMeasure(words.length, FEATURE_MEASURE)}ch`,
            "--ag-quote-size": cqw(size / width),
            "--ag-quote-mark": cqw(mark * FEATURE_MARK),
            "--ag-quote-mark-fill": String(MARK_OPACITY * FEATURE_FILL),
            "--ag-quote-soften": cqw(mark * MARK_BLUR * FEATURE_BLUR),
            "--ag-quote-climb": cqw(mark * FEATURE_CLIMB),
            "--ag-quote-line": String(LINE),
            "--ag-quote-gap": cqw(unit * EDGE),
          } as React.CSSProperties
        }
      >
        <Mark className="left-8 top-6 h-(--ag-quote-mark) opacity-(--ag-quote-mark-fill) blur-(--ag-quote-soften)" />
        <blockquote
          data-slot="quote-body"
          className={cn(
            WORDS,
            MEASURED,
            "ms-(--ag-quote-indent) pt-(--ag-quote-climb) text-(length:--ag-quote-size) leading-(--ag-quote-line) text-foreground/92",
          )}
        >
          {body}
        </blockquote>
        <By
          className={cn(BY, "mt-(--ag-quote-gap) gap-3 text-sm")}
          author={author}
          date={date}
          source={source}
          tone={tone}
          focus={focus}
          face="md"
        />
      </QuoteSurface>
    )
  }

  assert(
    material !== "glass",
    "the quote card is its own link preview and has no glass face; a glass quote is prose or feature",
  )

  // THE CARD. Every number below is the still's, recomputed as a share of the frame
  // rather than in pixels, so one set of constants drives both surfaces at any size.
  //
  // BLOCK_AT is the one that cannot cross: placing a block at an arbitrary fraction of
  // the slack means knowing how tall it turned out, and here the browser decides that
  // after this code has run. Centring is the only fraction the DOM gives for free, so
  // the two surfaces agree exactly while BLOCK_AT is a half and would need a measuring
  // pass the day it is not.
  assert(
    BLOCK_AT === 0.5,
    `the web card can only centre its words; BLOCK_AT is ${BLOCK_AT}`,
  )
  const height = width / aspect
  // Without a picture the words take the whole frame, exactly as the still gives it to
  // them; sizing them for the picture's column anyway set a bare quote 59% small.
  const column = author?.avatar
    ? 1 - FACE_SHARE - unit * (MARGIN + INDENT)
    : 1 - unit * (2 * MARGIN + INDENT)
  // The band the still composes in, so a quote too long for the frame THROWS here the
  // way it throws there. Without it the fixed aspect-ratio box just clipped the words
  // mid-sentence, silently — the one thing the module promises never happens.
  const nameSize = NAME_EM * width
  const band = height - 2 * unit * EDGE * width - (CAP + DESC) * nameSize
  const { size } = quoteSet(words, width * column, {
    bandH: band,
    ch,
    sizeMax: height * SIZE_MAX,
  })

  // The picture is a square as tall as the frame, slid so the subject clears the
  // dissolve, and bounded so it neither leaves ground at the right edge nor empties the
  // fade. Identical arithmetic to the still's, in fractions of the width.
  const faceX = 1 - FACE_SHARE
  const featherX = faceX + (1 - faceX) * FACE_FEATHER
  const slotX = Math.max(
    1 - 1 / aspect,
    Math.min(faceX, (featherX + 1) / 2 - focus / aspect),
  )
  // The mask runs across the PICTURE, so the stops are in its own coordinates.
  const into = (x: number) => pct((x - slotX) * aspect)
  const dissolve = `linear-gradient(to right, ${DISSOLVE.map(
    ([at, on]) => `rgb(0 0 0 / ${on}) ${into(faceX + (featherX - faceX) * at)}`,
  ).join(", ")})`

  // A CONTAINER, so every distance inside is a share of the CARD rather than of the
  // page: one set of constants drives a 1200px preview and a 480px column without a
  // breakpoint anywhere. The ground is two layers, grain over glow — the same filter the
  // still runs, tiled, so the glow does not band into rings in eight bits.
  return (
    <figure
      data-slot="quote"
      data-variant="card"
      className={cn(
        "relative m-0 @container aspect-(--ag-quote-aspect) overflow-hidden rounded-lg bg-(image:--ag-quote-ground) text-foreground",
        className,
      )}
      style={
        {
          "--ag-quote-ground": `${grainLayer()}, radial-gradient(${GLOW.r * 100}% ${GLOW.r * 100}% at ${GLOW.cx * 100}% ${GLOW.cy * 100}%, ${glowOf(tone?.ground ?? GROUND).join(", ")})`,
          "--ag-quote-ink": ink,
          "--ag-quote-aspect": `${CARD_W} / ${CARD_H}`,
          "--ag-quote-margin": pct(unit * MARGIN),
          "--ag-quote-indent": pct(unit * (MARGIN + INDENT)),
          "--ag-quote-edge": pct(unit * EDGE * aspect),
          "--ag-quote-floor": pct(
            unit * EDGE * aspect + (CAP + DESC) * NAME_EM * aspect,
          ),
          "--ag-quote-column": pct(column),
          "--ag-quote-measure": `${quoteMeasure(words.length)}ch`,
          "--ag-quote-size": cqw(size / width),
          "--ag-quote-name": cqw(NAME_EM),
          "--ag-quote-by-gap": cqw(NAME_EM * ATTRIB_GAP),
          "--ag-quote-date": cqw(DATE_EM),
          "--ag-quote-mark": cqw(MARK_EM / aspect),
          "--ag-quote-mark-fill": String(MARK_OPACITY),
          "--ag-quote-soften": cqw((MARK_EM / aspect) * MARK_BLUR),
          "--ag-quote-line": String(LINE),
          "--ag-quote-slot": pct(slotX),
          "--ag-quote-square": cqw(1 / aspect),
          "--ag-quote-dissolve": dissolve,
        } as React.CSSProperties
      }
    >
      {author?.avatar && (
        // THE BACKGROUND IS TWO THINGS AND ONLY TWO: the ground and the picture, with a
        // dissolve between them. The picture is a square as tall as the frame, never
        // cropped sideways — SLID so its subject clears the fade, and the mask hides the
        // rest. Sized in cqw on BOTH axes: a replaced element with `height: 100%` inside
        // a box whose height comes from `aspect-ratio` is a case Safari resolves as
        // indefinite (it collapsed to a strip along the top edge); a square whose side is
        // stated outright is the same number in every engine.
        // Decorative: the name below it is the accessible attribution.
        <Image
          data-slot="quote-portrait"
          className="absolute top-0 left-(--ag-quote-slot) size-(--ag-quote-square) max-w-none object-cover mask-(--ag-quote-dissolve)"
          src={author.avatar}
          alt=""
        />
      )}
      {/* The ghost, in the picture's own colour so it belongs to the photograph rather
          than to the type. It takes no space: the words are composed over it. */}
      <Mark className="left-(--ag-quote-margin) top-(--ag-quote-edge) h-(--ag-quote-mark) opacity-(--ag-quote-mark-fill) blur-(--ag-quote-soften)" />
      {/* The words are CENTRED in the band the mark and the attribution leave, so the air
          around them never depends on how long the quote is. The band's floor is the
          attribution's CAP, not its baseline: the still reserves (CAP+DESC)·nameSize
          below the band. The column IS --ag-quote-column: quoteSet was fed exactly this
          width, and any arithmetic on top of it re-wraps the lines the size was chosen
          for. */}
      <blockquote
        data-slot="quote-body"
        className={cn(
          WORDS,
          MEASURED,
          "absolute left-(--ag-quote-indent) top-(--ag-quote-edge) bottom-(--ag-quote-floor) flex w-(--ag-quote-column) flex-col justify-center text-(length:--ag-quote-size) leading-(--ag-quote-line) text-foreground",
        )}
      >
        {body}
      </blockquote>
      {/* ONE LINE at the foot, as far off the floor as the mark hangs from the ceiling —
          a matched pair holding the frame — and sized off the FRAME, never off the
          quote, so a set of cards has one caption. */}
      <By
        className={cn(
          BY,
          "absolute left-(--ag-quote-margin) bottom-(--ag-quote-edge) m-0 gap-(--ag-quote-by-gap) text-(length:--ag-quote-name)",
        )}
        nameClassName="text-[length:inherit]"
        dateClassName="text-(length:--ag-quote-date)"
        author={author}
        date={date}
      />
    </figure>
  )
}

/** THE MARK IS THE SIGNAL AT EVERY WEIGHT, and a rule down the side is not. A rule is
 *  what every blockquote on the web does; the mark is what makes this one the same object
 *  as its card. One drawing, shipped as an outline; each weight places and scales it. */
/** The mark, painted in the quote's ink through the outline `QuoteMarkMask` sets once
 *  per page (quote-mark). Printed as an svg in every quote, the 876-byte outline was
 *  most of a feed of short quotes. */
const MARK_ASPECT = `${MARK_BOX.w} / ${MARK_BOX.h}`

function Mark({ className }: { className: string }) {
  return (
    <>
      <QuoteMarkMask />
      <span
        data-slot="quote-mark"
        aria-hidden="true"
        className={cn(
          "absolute w-auto bg-(--ag-quote-ink) [mask:var(--ag-quote-mark-mask)_center/contain_no-repeat]",
          className,
        )}
        style={{ aspectRatio: MARK_ASPECT }}
      />
    </>
  )
}

/** ONE LINE: the name, then the date, then — where the weight has room for it — the
 *  source. The name is a NAME and stays in the page's own colour: colouring it makes the
 *  accent mean "person", which it means nowhere else, and pulls the eye off the
 *  sentence. */
function By({
  className,
  nameClassName,
  dateClassName,
  author,
  date,
  source,
  tone,
  focus,
  face,
}: Pick<QuoteData, "author" | "date" | "source"> & {
  className: string
  /** The card sets the name and the date off the FRAME; the other weights off the page. */
  nameClassName?: string
  dateClassName?: string
  tone?: QuoteTone
  focus?: number
  /** Which rung the face is drawn at; none, and there is no face. */
  face?: "sm" | "md"
}) {
  if (!author && !date && !source) return null
  return (
    <figcaption data-slot="quote-by" className={className}>
      {face &&
        author?.avatar &&
        // The same face as everywhere else on a page, from the same two facts the card
        // reads: positioned on the subject, ringed in the picture's colour; and a
        // lightbox trigger when the portrait is worth a look.
        (author.full ? (
          <AvatarPortrait
            src={author.avatar}
            alt={author.name}
            size={face}
            focus={focus}
            tone={tone}
            full={author.full}
          />
        ) : (
          <Avatar
            src={author.avatar}
            alt={author.name}
            size={face}
            focus={focus}
            tone={tone}
          />
        ))}
      {author && (
        <cite data-slot="quote-name" className={cn(NAME, nameClassName)}>
          {author.href ? (
            <a className={LINK} href={author.href}>
              {author.name}
            </a>
          ) : (
            author.name
          )}
        </cite>
      )}
      {date && (
        <span
          data-slot="quote-date"
          className={cn(META, "text-xs", dateClassName)}
        >
          {date}
        </span>
      )}
      {source && (
        <a
          data-slot="quote-source"
          className={cn(META, LINK, "ms-auto text-xs")}
          href={source}
          target="_blank"
          rel="noopener noreferrer"
        >
          source ↗
        </a>
      )}
    </figcaption>
  )
}
