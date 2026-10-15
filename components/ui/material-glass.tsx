import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"
import "./material-glass.css"

// THE GLASS MATERIAL, the one look every glass face is made of: the base controls'
// glass faces (button, badge, panel, textarea, …, `material="glass"`) and the whole
// liquid-glass collection read their glass from here, so glass is one material
// everywhere and a control that draws it pulls in this file, not the collection.
// Server-safe (no context, no state): `Glass` and `GlassEdge` render anywhere.

/** THE LIGHT ON A GLASS EDGE, defined once. Every edge of glass draws with these
 *  colours, whatever it is on: a control's glass (`glassVariants`), glass round media
 *  (`GlassEdge`), a lit pane inside a bar (`glassLift`), a pane's seam. All of it is
 *  derived; what is turned is the glass's state (`--glass-rim`), the light's colour
 *  (`--glass-rim-color`, `--glass-hue`) and the ground's (`--glass-ground-sheen`).
 *  Light and dark faces differ in their values here, never in how they are drawn. */
export const glassLight = [
  // THE STAIN, the one way glass takes a colour: `--glass-stain` (any CSS colour) at
  // `--glass-stain-amount` (20% unless set), whoever sets it: `tint` (glassStyle), a
  // parent staining every glass inside it, a control's state (on, invalid: a status
  // is stained as any colour is). From the stain alone, worked out here: its HUE,
  // the same colour made vivid and readable (lightness at least 0.78, chroma doubled
  // up to 0.2, a grey staying grey), which the light body and the rim wear, and its
  // DEEP hue, the same colour at depth (lightness at most 0.5) for the dark body,
  // where a light colour mixed in read as haze and the raw one as mud. Unstained,
  // both are invalid and every use falls back to the glass's own.
  "[--glass-hue:oklch(from_var(--glass-stain)_max(l,0.78)_min(calc(c*2),0.2)_h)] [--glass-hue-deep:oklch(from_var(--glass-stain)_min(l,0.5)_min(calc(c*2),0.2)_h)]",
  // The light around the glass: white, leaning toward the colour of what it stands
  // over (`--glass-ground`, the picture's colour under it, set by ui/backdrop), made
  // light and clear (lightness at least 0.85), by `--glass-ground-share` (35% unless
  // set). Light catching a curve takes the colour around it, a red rock's edge
  // warming, a sky's cooling (Apple's glass does; Adrian, 2026-10-11). No picture
  // read, white (the registered property's own, material-glass.css). Registered, so
  // a change of ground eases.
  "[--glass-ground-light:color-mix(in_oklab,oklch(from_var(--glass-ground)_max(l,0.85)_min(calc(c*1.5),0.2)_h)_var(--glass-ground-share,35%),white)]",
  // The light the rim catches: `--glass-rim-color` when set (an edge that says
  // something on its own), else the stain's hue, else the light around it. A colour
  // reads as itself on the edge, where the glass is brightest.
  "[--glass-rim-ink:var(--glass-rim-color,var(--glass-hue,var(--glass-ground-light)))]",
  // How strongly the rim reads against its ground, a multiple of all its light: the
  // same white catch reads several times stronger on dark glass ("overpowering" as a
  // full outline; as a corner catch alone, a touch less was right, Adrian,
  // 2026-10-11), so the dark face carries 0.8 of it. Over a picture the picture under
  // the glass decides (`--glass-ground-sheen`, set by ui/backdrop on the surface or on
  // a group round several, and inherited: the face's own number is only the fallback,
  // so a group's reading reaches every glass inside it).
  "[--glass-sheen:var(--glass-ground-sheen,1)] scheme-dark:[--glass-sheen:var(--glass-ground-sheen,0.8)]",
  // Glass ON glass (a field in a glass panel, a chosen segment in a glass bar):
  // what is under it is the outer glass, already frosted and tinted, never the
  // picture (the outer glass's blur makes it a backdrop root, so the inner one sees
  // only that). A full tint over it doubled the darkening into a flat, washed-out
  // slab ("too intense", Adrian, 2026-10-11), so inner glass carries
  // `--glass-on-glass` of its thickness (0.65), and `--glass-on-glass-rim` of its
  // edge's light (0.85): less than full, as the outer glass already tints and lights
  // what is under it, but at half of each an inner card read as faint, its body and
  // its soft edge (Adrian, 2026-10-11). Told by `--glass-body`, which every glass
  // BODY sets (`glassVariants`) and what is inside inherits; asked of the parent (a
  // container style query asks the nearest ancestor), so a body's own mark never
  // counts for itself. Not `data-material`: every control's root wears that for its
  // face, and a radio group's root, a slider's track or a tab list read as glass
  // stood on the picture at on-glass strength.
  "[--glass-stack:1] [--glass-stack-rim:1] [@container_style(--glass-body:1)]:[--glass-stack:var(--glass-on-glass,0.65)] [@container_style(--glass-body:1)]:[--glass-stack-rim:var(--glass-on-glass-rim,0.85)]",
  // How strong the edge's line is, the one multiple every part below reads: the
  // glass's state, its ground and what it stands on. At 1 the edge is the one set by
  // eye on frames over pictures, dark and light (Adrian, 2026-10-11), and every glass
  // wears it, a control's as a frame's. A look (`glassLooks`) carries a multiple of
  // its own, `--glass-look-rim`, inherited, so a page or a container can wear a look
  // while each glass in it keeps its own state.
  // A GHOST (`--glass-ghost`, 0 to 1: an inherited value, ui/setting) carries less
  // than half of every part of its light: what it shows applies, but is not set here.
  "[--glass-strength:calc(var(--glass-rim,1)*var(--glass-look-rim,1)*var(--glass-sheen,1)*var(--glass-stack-rim)*(1-0.55*var(--glass-ghost)))]",
  // The GLOW's strength, the soft light under the line: the same, without the
  // sheen. The sheen tunes the fine line to how strongly it reads against its
  // ground; the glow is the curve's body, the same at rest on either face.
  "[--glass-glow:calc(var(--glass-rim,1)*var(--glass-look-rim,1)*var(--glass-stack-rim)*(1-0.55*var(--glass-ghost)))]",
  // The catch at the corner facing the light (from the top left), at its brightest.
  "[--glass-catch:color-mix(in_oklab,var(--glass-rim-ink)_calc(25%*var(--glass-strength)),transparent)]",
  // The far corner, where the two faces differ as glass does. On the dark face a
  // fainter catch of light. On the light face, where a white catch has nothing to
  // stand against (light glass over a white sky showed no edge at all), the curve's
  // refraction: it bends darker light in, a faint dark band on the side away from
  // the light.
  "[--glass-far:rgb(24_32_44/calc(0.075*var(--glass-strength)))] scheme-dark:[--glass-far:color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-strength)),transparent)]",
  // WHERE the light lies along the edge, from the glass's radius (`--glass-radius`, a
  // length every glass states once: it draws the corners too). A rounded corner's
  // edge begins (√2 − 1) × its radius along the light's 135° line from the box's
  // corner (`--glass-curve`), so the catch is brightest there (`--glass-corner`; the
  // far corner's `--glass-corner-far`, the same unless a shape squares one, a sheet
  // against the screen's edge, which sets it to 0). Taken as a share of the box's
  // diagonal it peaked at the shape only for a circle: a pill's catch began at 57%
  // and a wide field's at 81% of its light. From there each line falls to nothing
  // over 120 px (to 27.5% at 0.4375 of it), the fall the edge was set by eye with
  // on frames over pictures (a 372 × 209 frame, radius 20: within 4 px of it) and
  // about a 320 × 200 card's; never past the middle of the line, where the other
  // corner's begins (on a 40 px circle that is the fall it had, within 2 px).
  "[--glass-curve:calc(0.41421356*var(--glass-radius))] [--glass-corner:var(--glass-curve)] [--glass-corner-far:var(--glass-curve)] [--glass-fall:min(calc(var(--glass-corner)+120px),50%)] [--glass-fall-far:min(calc(var(--glass-corner-far)+120px),50%)]",
  // Each line's fall as the mask that draws it, from its own corner.
  "[--glass-catch-mask:linear-gradient(135deg,#000_var(--glass-corner),rgb(0_0_0/0.275)_calc(var(--glass-corner)+0.4375*(var(--glass-fall)-var(--glass-corner))),transparent_var(--glass-fall))] [--glass-far-mask:linear-gradient(315deg,#000_var(--glass-corner-far),rgb(0_0_0/0.275)_calc(var(--glass-corner-far)+0.4375*(var(--glass-fall-far)-var(--glass-corner-far))),transparent_var(--glass-fall-far))]",
  // The edge's knobs, each resolved here once, the only names read below: the
  // line's width and softness (1 px each unless set), the glow's depth (4 px), the
  // stain's amount (20%; a ghost's, a third of it).
  "[--glass-width:var(--glass-rim-width,1px)] [--glass-softness:var(--glass-rim-softness,1px)] [--glass-depth:var(--glass-rim-depth,4px)] [--glass-amount:calc(var(--glass-stain-amount,20%)*(1-0.65*var(--glass-ghost)))]",
  // The light inside the edge, the rim's soft body: a glow inside the lit corner
  // and a fainter one inside the far one, falling off over the depth (a hairline
  // beside a card, a thick band on a glass the size of an icon, which takes less),
  // at the glow's strength on either face.
  "[--glass-inner:inset_calc(var(--glass-depth)/4)_calc(var(--glass-depth)/2)_var(--glass-depth)_calc(var(--glass-depth)/-2)_color-mix(in_oklab,var(--glass-rim-ink)_calc(29%*var(--glass-glow)),transparent),inset_calc(var(--glass-depth)/-4)_calc(var(--glass-depth)/-2)_var(--glass-depth)_calc(var(--glass-depth)/-2)_color-mix(in_oklab,var(--glass-rim-ink)_calc(15%*var(--glass-glow)),transparent)]",
].join(" ")

/** The rim, drawn from that light: a SPECULAR edge, the light catching the curve where
 *  it faces the light, brightest at that corner, nothing along the sides, the far
 *  corner's own light (`--glass-far`) at the opposite one. Nothing on it is the same
 *  all the way round: a hairline round the whole shape and a dark one along the foot
 *  drew a grey outline, the opposite of a reflection ("a classic gray, a bit thicker
 *  line", Adrian, 2026-10-11). A whole pixel, softened by one, so it melts into the
 *  glow under it (`--glass-inner`) as one soft rim: a crisp half pixel read as a fine,
 *  harsh line, a soft one as a curve.
 *
 *  Two lines, one profile mirrored: the catch on `::before`, brightest where the
 *  SHAPE's edge begins along the light's line and falling over `--glass-fall`
 *  (`--glass-catch-mask`, worked out from the radius in `glassLight`); the far
 *  corner's on `::after`, the same from its own corner. Each is an inset shadow ring
 *  (it follows the radius and is anti-aliased like an SVG stroke in Chrome and
 *  WebKit) shaped by a gradient mask; a ring cut out by masks draws heavier round
 *  the curves than along the sides in Chrome at 2x (measured, 2026-10-11). Both
 *  pseudo-elements are the edge's: an element wearing it draws nothing of its own
 *  on them. */
const GLASS_RIM = [
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:content-[''] before:shadow-[inset_0_0_var(--glass-softness)_var(--glass-width)_var(--glass-catch)] before:[mask-image:var(--glass-catch-mask)]",
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] after:shadow-[inset_0_0_var(--glass-softness)_var(--glass-width)_var(--glass-far)] after:[mask-image:var(--glass-far-mask)]",
  "forced-colors:before:hidden forced-colors:after:hidden",
].join(" ")

/** The edge of glass alone, without its body: its light, its rim and the light inside
 *  it, on a POSITIONED element that is rounded as the glass is. For an edge with no
 *  glass body under it: glass round media (`GlassEdge`), a pane lit inside a bar
 *  (`glassLift`). A whole glass is `glassVariants`, which wears this same edge. */
export const glassEdge = `${glassLight} ${GLASS_RIM} rounded-(--glass-radius) shadow-(--glass-inner)`

/** Coloured words on glass (a field's error, a toned value or name): the rim's light
 *  along their foot, so they hold over the frost. */
export const glassWords =
  "[text-shadow:0_0.5px_0_color-mix(in_oklab,var(--glass-rim-ink,white)_35%,transparent)]"

/** A pane lit inside a glass (a bar's chosen segment): a faint fill of its words'
 *  colour, under glass's own edge. Absolute in the bar, rounded as its options are. */
export const glassLift = `bg-current/12 ${glassEdge}`

/** The shapes glass comes in, its box alone (the layout, the corners): what a piece
 *  shaped as glass and drawn by something else wears (a fluid glass, whose frost is
 *  a layer of its own). Each states its radius (`--glass-radius`); a round one
 *  (circle, pill, bar) is sized by `--glass-size` (its height; a circle's width
 *  too), its radius half of it, so a round glass made bigger stays round and its
 *  light stays at its curve: set `[--glass-size:3rem]`, never a size of its own.
 *  `surface` is the box alone: the control wearing it states its radius. */
export const glassShapes = {
  surface: "",
  circle:
    "inline-grid size-(--glass-size) shrink-0 place-items-center [--glass-size:2.5rem] [--glass-radius:calc(var(--glass-size)/2)]",
  pill: "inline-flex min-h-(--glass-size) items-center gap-2 px-4 py-2 [--glass-size:2.5rem] [--glass-radius:calc(var(--glass-size)/2)]",
  bar: "inline-flex h-(--glass-size) items-center gap-1 p-1.5 [--glass-size:3.25rem] [--glass-radius:calc(var(--glass-size)/2)]",
  card: "p-5 [--glass-radius:--theme(--radius-3xl)]",
} as const

/** LOOKS: a whole way of drawing the glass's light, worn by a glass or by anything
 *  round several (inherited, so a page can wear one), never a value tuned on one
 *  glass. Each glass keeps its own state (`--glass-rim`) inside it.
 *
 *  `apple`: the edge macOS renders on an app's icon, set by eye beside those icons
 *  (Adrian, 2026-10-11): a fine crisp line (half a pixel, no softness) a little brighter
 *  than the material's, a shallow light under it (2 px), and the body shaded across
 *  from the light's corner, a neutral grey lighter at the top left and darker at the
 *  bottom right. Glass among app icons wears it so it reads as one of them. */
export const glassLooks = {
  apple:
    "[--glass-look-rim:1.65] [--glass-rim-width:0.5px] [--glass-rim-softness:0px] [--glass-rim-depth:2px] [--glass-shade:1]",
} as const
export type GlassLook = keyof typeof glassLooks

/** The glass's BODY: the frosted, tinted face what it holds lies on. ONE glass,
 *  light or dark as the scheme it stands in says (`scheme-dark:`, from @ag/tokens).
 *  The light face frosts harder than the dark: its words are dark on a pale ground
 *  the picture's texture shows through, where the dark face's 60% black already
 *  hides it; at 5px a sky's clouds ran right under the words and the light glass read
 *  worse than the dark over the same picture (Adrian, 2026-10-11). The body is the
 *  face (`--glass-face`: `--glass-tint`, else the face's own at `--glass-thickness`)
 *  with the stain's hue mixed in; unstained, the face mixed with itself.
 *
 *  `--glass-body` marks a body, and only a body: what is inside stands on glass
 *  (`glassLight`'s stack). `data-material` is the face's, worn by every control
 *  whatever it stands on. */
const GLASS_BODY = [
  "[--glass-body:1]",
  // The face and the hue its stain takes on it (the light hue on the light face,
  // the deep one on the dark), mixed once; and what the glass does to the picture
  // behind it, `--glass-backdrop`, a whole filter in its order (a frost of its own,
  // a fluid glass's, replaces it there and nowhere else).
  // A ghost's body is a third as thick (`--glass-ghost`): the picture shows through
  // what is only inherited.
  "[--glass-face:var(--glass-tint,rgb(242_244_247/calc(var(--glass-thickness,0.7)*var(--glass-stack)*(1-0.65*var(--glass-ghost)))))] [--glass-body-hue:var(--glass-hue)] [--glass-backdrop:blur(var(--glass-blur,14px))_saturate(1.4)]",
  "scheme-dark:[--glass-face:var(--glass-tint,rgb(16_16_18/calc(var(--glass-thickness,0.6)*var(--glass-stack)*(1-0.65*var(--glass-ghost)))))] scheme-dark:[--glass-body-hue:var(--glass-hue-deep)] scheme-dark:[--glass-backdrop:blur(var(--glass-blur,6px))_saturate(1.25)]",
  "[-webkit-backdrop-filter:var(--glass-backdrop)] [backdrop-filter:var(--glass-backdrop)]",
  "bg-[color-mix(in_oklab,var(--glass-body-hue,var(--glass-face))_var(--glass-amount),var(--glass-face))] supports-[not(backdrop-filter:blur(1px))]:bg-background/95",
  // The body's SHADE, lit across from the light's corner as its edge is: lighter
  // where the light comes from (top left), darker at the far corner, neutral, over
  // the face. `--glass-shade` of it (0 unless a look sets it: the body is the face
  // alone). It is the glass's light, so it goes with its rim: a flat sheet with no
  // rim (a bar, a rail: `rim={0}`) has no shade, where a page-wide look laid a
  // light patch across the whole sheet (Adrian, 2026-10-11); a brighter state
  // keeps it as at rest.
  "[background-image:linear-gradient(135deg,rgb(255_255_255/calc(0.45*var(--glass-shade,0)*min(var(--glass-rim,1),1))),transparent_55%,rgb(24_32_44/calc(0.08*var(--glass-shade,0)*min(var(--glass-rim,1),1))))] scheme-dark:[background-image:linear-gradient(135deg,rgb(255_255_255/calc(0.12*var(--glass-shade,0)*min(var(--glass-rim,1),1))),transparent_55%,rgb(0_0_0/calc(0.3*var(--glass-shade,0)*min(var(--glass-rim,1),1))))]",
].join(" ")

/** CSS glass: a translucent body (`GLASS_BODY`) and the glass's edge (`glassLight`,
 *  `GLASS_RIM`), its drop shadow what parts it from the page. Keep the center clear
 *  enough for the backdrop to show through. The edge's pseudo-elements follow the
 *  radius without clipping content or focus rings. `edge: false` is the body alone,
 *  for glass whose edge is drawn above what it holds (a pane's); `edge: "only"` the
 *  edge and its shadow with no body at all, no fill and no backdrop filter (a glass
 *  `outline`: the rim alone, the picture untouched under it).
 * It sets `relative` (the rim hangs off it): in a `cn()` a placement of the surface's
 * own (`absolute`, `fixed`, `sticky`) comes AFTER it, or tailwind-merge keeps
 * `relative` and the surface falls into the flow.
 */
export const glassVariants = cva(
  [
    // Its corners are its radius, the one length its light is placed by too.
    "relative isolate bg-clip-padding rounded-(--glass-radius)",
    // Its rim's state is its own, 1 until it says otherwise: `--glass-rim` is
    // inherited (so a bare edge follows the glass it belongs to), and a glass inside
    // another took the outer one's state, a rail's flat sheet (`rim={0}`) putting out
    // the edge of every icon on it. A control's states set it after this.
    "[--glass-rim:1]",
    glassLight,
    // Focus is @ag/tokens' ring, the keyboard's only: a fine line just off the
    // glass's edge in the content's colour, following its radius.
    "disabled:pointer-events-none disabled:[&>svg]:opacity-40",
    // A change of scheme (the picture under it turned light or dark) eases: the body,
    // the words (what is inside inherits them as they move) and the light, never a
    // cut, over `--glass-change` (300 ms on the material's ease unless
    // `--glass-change-duration` or `--glass-change-ease` say otherwise); its rim's
    // state (`--glass-rim`, a hover, a focus) moves with it. The glass is the ONE
    // owner of its face's transition: a control's own motion goes in through
    // `--glass-moves`, whole items of `transition` (`opacity_150ms_ease-out,…`), never
    // a `transition-*`, `duration-*` or `ease-*` of its own, which tailwind-merge
    // weighed against these and dropped one or the other: a tooltip lost its fade,
    // an input its scheme ease (scripts/examples/glass-faces.tsx refuses one).
    // The shadow is never transitioned itself: the light in it eases through the
    // registered properties it is made of (`--glass-rim`, the sheen, the ground's
    // light), the shadow following them frame by frame. Transitioned as well, a layer
    // in the text's colour (an outline's ring, a pressed rim stained `currentColor`)
    // computed transparent for the whole transition, Chrome unable to blend a colour
    // still bound to the text: an outline lost its ring on every hover and every
    // leave (Adrian, 2026-10-11, measured: transparent from the hover to 300 ms).
    "[--glass-change:var(--glass-change-duration,300ms)_var(--glass-change-ease,var(--ease-out))] [transition:var(--glass-moves,background-color_0s),background-color_var(--glass-change),color_var(--glass-change),--glass-rim_var(--glass-change),--glass-ghost_var(--glass-change),--glass-sheen_var(--glass-change),--glass-ground-light_var(--glass-change)] motion-reduce:[transition:none]",
    "forced-colors:border",
    // Its words are the scheme's foreground, so everything inside reads on it with no
    // ink of its own; its drop shadow is the scheme's.
    "text-foreground scheme-light:text-zinc-950 [--glass-drop:0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22)] scheme-dark:[--glass-drop:0_4px_16px_-6px_rgb(0_0_0/0.28)]",
  ],
  {
    variants: {
      edge: {
        true: [
          GLASS_BODY,
          GLASS_RIM,
          "shadow-[var(--glass-drop),var(--glass-inner)]",
        ],
        false: [GLASS_BODY, "shadow-(--glass-drop)"],
        only: [GLASS_RIM, "shadow-[var(--glass-drop),var(--glass-inner)]"],
      },
      // The scheme the surface stands in: the page's (`auto`), or its own whatever
      // the page is. `dark` is the theme's own class on the surface, so the page's
      // colour variables flip there and in everything inside it: words, icons and
      // nested controls read on the glass by themselves. `light` (light glass over
      // a picture on a dark page) is the glass and its words only: the page's
      // variables have no light block to flip to, so what is inside reads in
      // `currentColor`, as every glass face's words do.
      scheme: {
        auto: "",
        light: "light",
        dark: "dark",
      },
      shape: glassShapes,
    },
    defaultVariants: { edge: true, scheme: "auto", shape: "card" },
  },
)

/** The colour scheme a surface WEARS: the page's, or light or dark whatever the page
 *  is. What a control is asked for may also be `backdrop` (material's `Scheme`),
 *  which is resolved to one of these before anything is drawn. */
export type WornScheme = NonNullable<
  VariantProps<typeof glassVariants>["scheme"]
>

/** The class a surface of either material wears for its scheme: the theme's `dark`
 *  (the page's colour variables flip on it and inside it), or `light` with light
 *  words (its glass and its `currentColor`; the page's variables stay). One helper,
 *  so no control spells it its own way. */
export const schemeOf = (scheme: WornScheme): string | undefined =>
  scheme === "auto" ? undefined : scheme
export type GlassShape = NonNullable<
  VariantProps<typeof glassVariants>["shape"]
>

/** Optional CSS controls; they can also be inherited from a parent or set in Tailwind. */
export type GlassStyle = React.CSSProperties & {
  "--glass-blur"?: string
  /** What the glass does to the picture behind it, a whole `backdrop-filter` in its
   *  order (unset, a blur of `--glass-blur` and the face's saturation). */
  "--glass-backdrop"?: string
  /** A control's own motion on its glass face, whole items of `transition`
   *  (`opacity 150ms ease-out, scale 150ms ease-out`). */
  "--glass-moves"?: string
  /** How long and on what curve the glass eases its own change (300 ms on the
   *  material's ease unless set). */
  "--glass-change-duration"?: string
  "--glass-change-ease"?: string
  /** A front surface's height (`GlassFront`), set by its owner, who pads what the
   *  glass holds by the same length. */
  "--glass-front-height"?: string
  /** How much a front surface blurs what passes under it (12px unless set). */
  "--glass-front-blur"?: string
  /** A front surface's own face, any CSS colour (unset, the page's background at
   *  55%, hued by the stain). */
  "--glass-front-color"?: string
  "--glass-tint"?: string
  /** The opacity of the face's own tint (0..1; 0.7 light, 0.6 dark unless set): a
   *  backdrop source sets it to what the words over its picture need. */
  "--glass-thickness"?: number | string
  /** How strongly the rim reads against its ground, a multiple of its light; unset,
   *  the face's own (1 light, 0.8 dark). A backdrop source sets it from the picture
   *  under the glass; inherited, so set on a group it reaches every glass inside. */
  "--glass-ground-sheen"?: number | string
  /** How bright the rim and its inner reflections are, a multiple of the default. */
  "--glass-rim"?: number | string
  /** A ghost, 0 to 1 (0 unless set): a value that applies but is not set here
   *  (ui/setting). At 1 the body is a third as thick, the rim and its glow under
   *  half as bright, the stain a third as strong. Not inherited; eased. */
  "--glass-ghost"?: number | string
  /** How thick the rim is. */
  "--glass-rim-width"?: string
  /** How soft the rim's line is, a blur (1px unless set). */
  "--glass-rim-softness"?: string
  /** How deep the soft light inside the rim reaches, a length (4px unless set). */
  "--glass-rim-depth"?: string
  /** A look's multiple of the edge's light, beside the glass's own state (1 unless
   *  a look sets it; inherited). */
  "--glass-look-rim"?: number | string
  /** How much the body is shaded across from the light's corner, 0 to 1 (0 unless a
   *  look sets it). */
  "--glass-shade"?: number | string
  /** The glass's corner radius, a LENGTH every glass states once (never a share:
   *  a percentage is not a radius). It draws the corners (`rounded-(--glass-radius)`)
   *  and places the edge's light at the curve. A glass rounded fully states half its
   *  height. Not inherited: a glass that states none draws square, its edge's light
   *  a whole ring. */
  "--glass-radius"?: string
  /** A round shape's height (a circle's width too), its radius half of it
   *  (`glassShapes`: 2.5rem unless set). */
  "--glass-size"?: string
  /** Where the far corner's light begins along the light's line, a length (unless
   *  set, the same as the lit corner's, from the radius): 0 for a shape whose far
   *  corner is square. */
  "--glass-corner-far"?: string
  /** Where the lit corner's light begins, likewise (0 for a square lit corner). */
  "--glass-corner"?: string
  /** The colour of the light the rim catches; unset, the stain's hue, else the light
   *  around the glass (white leaning toward its ground). */
  "--glass-rim-color"?: string
  /** A colour the glass is stained with, any CSS colour; set on a parent, every
   *  glass inside wears it. Its hue for the body and the rim is worked out from it
   *  (`glassLight`). */
  "--glass-stain"?: string
  /** How much of the stain is mixed in, a percentage (20% unless set). */
  "--glass-stain-amount"?: string
  /** How much of its tint a glass ON glass carries, a multiple (0.65 unless set):
   *  the outer glass already frosts and tints what is under it. */
  "--glass-on-glass"?: number | string
  /** How much of its edge's light a glass ON glass carries, a multiple (0.85
   *  unless set). */
  "--glass-on-glass-rim"?: number | string
  /** The colour of what the glass stands over; a backdrop source sets it from the
   *  picture under the glass. Its rim's light leans toward it. */
  "--glass-ground"?: string
  /** How far the rim's light leans toward `--glass-ground`, a percentage (35%
   *  unless set). */
  "--glass-ground-share"?: string
}

/** What a glass's light can be told, one by one: the props `Glass` takes, and
 *  what `glassStyle` turns into its custom properties for any element that wears
 *  `glassVariants` itself (a control's glass face). */
export interface GlassLight {
  /** The rim's brightness as a multiple of the default (1). A glass ring around
   *  an image that already carries its own edge wants more, so the two read as
   *  one family. Sets `--glass-rim`. */
  rim?: number
  /** The rim's thickness, any CSS length (default 1px). Sets `--glass-rim-width`. */
  rimWidth?: string
  /** The colour of the light on the rim, for an edge that says something on its
   *  own. Unset, the rim is the tint's hue, else the light around the glass (white
   *  leaning toward its ground). Sets `--glass-rim-color`. */
  rimColor?: string
  /** A colour to stain the glass with: a brand or a project's accent, so glass on
   *  its pages belongs to it, or a status (`var(--tone-ok)`: a success badge, an
   *  error toast, an invalid field), stained the same amount, the colour said again
   *  on its mark (an icon, a title, the rim) and never on all its words. Mixed into
   *  the face's own tint, never replacing it; unset, the glass is untouched. Sets
   *  `--glass-stain`, which a parent can set instead to stain every glass inside. */
  tint?: string
  /** How much of `tint` goes in, 0 to 1 (default 0.2, the material's, set by eye
   *  with the tint sample's knobs). Sets `--glass-stain-amount`. */
  tintAmount?: number
}

export type GlassProps<T extends React.ElementType = "div"> = {
  /** Render a native element or a component that forwards className and ref. */
  as?: T
  shape?: GlassShape
  scheme?: WornScheme
  className?: string
  style?: GlassStyle
} & GlassLight &
  Omit<
    React.ComponentPropsWithRef<T>,
    | "as"
    | "shape"
    | "scheme"
    | "rim"
    | "rimWidth"
    | "rimColor"
    | "tint"
    | "tintAmount"
    | "className"
    | "style"
  >

/** A glass's light as the custom properties `glassVariants` reads: nothing for what
 *  is unset, so a parent's (a tint set on a page) still reaches it, and no default of
 *  its own (the material's are in `glassLight` and the body). */
export function glassStyle({
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount,
}: GlassLight): GlassStyle {
  return {
    ...(rim === undefined ? {} : { "--glass-rim": rim }),
    ...(rimWidth === undefined ? {} : { "--glass-rim-width": rimWidth }),
    ...(rimColor === undefined ? {} : { "--glass-rim-color": rimColor }),
    ...(tint === undefined ? {} : { "--glass-stain": tint }),
    ...(tintAmount === undefined
      ? {}
      : { "--glass-stain-amount": `${tintAmount * 100}%` }),
  }
}

/** Style with Tailwind, compose with `as`, and pass native props/ref directly. Its
 *  children are its content and nothing else: the glass draws on the element itself
 *  (`glassVariants`), its lines on its two pseudo-elements, which lie over content
 *  that is not positioned, its glow an inset shadow under the content. Content held
 *  to the edge (an icon in a ring of glass) covers the glow where it reaches; keep
 *  it a few pixels in (the glow lies within about 3 px of the edge: an image inset
 *  7% of a 40 px ring leaves nine tenths of it showing). */
export function Glass<T extends React.ElementType = "div">({
  as,
  shape = "card",
  scheme = "auto",
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount,
  className,
  style,
  ...props
}: GlassProps<T>) {
  return React.createElement(as ?? "div", {
    "data-slot": "glass",
    "data-material": "glass",
    "data-shape": shape,
    "data-scheme": scheme,
    ...(as === "button" ? { type: "button" } : {}),
    ...props,
    style: {
      ...glassStyle({ rim, rimWidth, rimColor, tint, tintAmount }),
      ...style,
    },
    className: cn(glassVariants({ shape, scheme }), className),
  })
}

/** Glass as an edge only, over what runs to it: the material's own edge
 *  (`glassEdge`), nothing around it (no mat, no padding, no body). Over the box it is
 *  placed in (absolute, inset 0), at that box's `radius`. The one edge for glass round
 *  media, a display's frame (glass-display) and anything small that frames a picture
 *  in glass (the player's zoom finder), and for a pane whose edge lies over what it
 *  holds (a glass Panel). `scheme` is the face it shows, as a surface's: unset, the
 *  page's. Its brightness is `--glass-rim`, set on it or above it. */
export function GlassEdge({
  radius,
  scheme = "auto",
  className,
  style,
}: {
  /** The box's corner radius, a CSS length (never a percentage). */
  radius: string
  scheme?: WornScheme
  className?: string
  style?: GlassStyle
}) {
  return (
    <div
      aria-hidden
      data-slot="glass-edge"
      className={cn(
        glassEdge,
        schemeOf(scheme),
        "pointer-events-none absolute inset-0 z-30",
        className,
      )}
      style={{ "--glass-radius": radius, ...style } satisfies GlassStyle}
    />
  )
}

/** Which side of its glass a front surface lies along. */
export type GlassFrontAt = "top" | "bottom"

/** THE FRONT SURFACE: a strip of glass in FRONT of what a glass holds, across its top
 *  or along its foot, part of the glass and not a piece laid on it. Content passing
 *  under it (a board's columns under their names, a list scrolling under its tabs) is
 *  seen through it only as light: it blurs what is under it (`--glass-front-blur`,
 *  12px unless set) on a face of its own (`--glass-front-color`; unset, the page's
 *  background at 55%, hued by the glass's stain). Its corners are its glass's on its
 *  side (`rounded-*-[inherit]`, never cut by a clip: a blur cut at a rounded clip
 *  draws jagged corners). Its inner edge is one unbroken hairline (`::after`) lit by
 *  the rim's own catch from the side the light comes from, at 27.5% of the catch at
 *  the left (where the catch's first fall ends), dimming evenly to the right. It casts
 *  no shadow: its edge and its blur say where it begins, and a shadow with nothing
 *  under it is a smear. It works its light out itself (`glassLight`), from the inputs
 *  its glass sets (the stain, the rim, the scheme), so a stained glass stains it too.
 *
 *  These are the surface alone, placed by whoever wears them: `GlassFront` lays it
 *  over a glass (absolute, `--glass-front-height` tall); a list pinned over content
 *  that scrolls wears the classes on its own element (`sticky top-0`). Its glass must
 *  not blur on the element that holds it: a backdrop blur inside another sees only
 *  what is between the two, so a front inside a blurring body blurs nothing that
 *  passes under it (a glass Panel blurs on a back layer for that reason). */
const GLASS_FRONT = [
  "backdrop-blur-[var(--glass-front-blur,12px)] backdrop-saturate-125",
  glassLight,
  "bg-[color:var(--glass-front-color,color-mix(in_oklab,var(--glass-hue,color-mix(in_oklab,var(--background)_55%,transparent))_var(--glass-amount),color-mix(in_oklab,var(--background)_55%,transparent)))]",
  "after:pointer-events-none after:absolute after:inset-x-0 after:h-(--glass-width) after:content-[''] after:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--glass-catch)_27.5%,transparent),color-mix(in_oklab,var(--glass-catch)_7.5%,transparent))]",
].join(" ")
export const glassFront: Record<GlassFrontAt, string> = {
  top: `${GLASS_FRONT} rounded-tl-[inherit] rounded-tr-[inherit] after:bottom-0`,
  bottom: `${GLASS_FRONT} rounded-bl-[inherit] rounded-br-[inherit] after:top-0`,
}

/** A front surface over its glass: absolute across the side it lies along (`at`),
 *  `--glass-front-height` tall (set by its owner, who pads what the glass holds by
 *  the same length), above what the glass holds (`z-10`). Place it inside the glass,
 *  a sibling of the content, with the glass's edge drawn over both (`GlassEdge`,
 *  above it): a face's own rim lies under anything positioned, the front included.
 *  Server-safe. */
export function GlassFront({
  at = "top",
  color,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "style" | "color"> & {
  at?: GlassFrontAt
  /** Its own face, any CSS colour, thin enough to stay glass; unset, the page's
   *  background at 55%, hued by the glass's stain. */
  color?: string
  style?: GlassStyle
}) {
  return (
    <div
      data-slot="glass-front"
      data-at={at}
      className={cn(
        "absolute inset-x-0 z-10 h-(--glass-front-height)",
        at === "top" ? "top-0" : "bottom-0",
        glassFront[at],
        className,
      )}
      style={
        color === undefined
          ? style
          : ({ "--glass-front-color": color, ...style } satisfies GlassStyle)
      }
      {...props}
    />
  )
}

/** THE BEND, where a curved edge bends the picture under it: a band just inside the
 *  edge where the picture is refracted, softened and a touch brighter (the curve
 *  gathers light from a wider patch, as a lens does), strongest at the edge and
 *  fading into the clear middle over about 14 px per unit of `bend` (`bendLayers`).
 *  What a frame over a picture has for depth, with no glass body to give it; a white
 *  glow there read as a wash, not as glass (Adrian, 2026-10-11).
 *
 *  Place it over the picture INSIDE the picture's rounded clip (absolute, inset 0,
 *  after the picture): a backdrop blur reads the square box behind it, and outside
 *  the clip that square's corners hold the page, which the blur dragged in as a dark
 *  smudge at every corner; inside, they hold picture, and the clip cuts the result
 *  smoothly.
 *
 *  Its shape is the edge's own: a rounded rectangle at the box's radius, its
 *  outline blurred, so the band follows the rim round every corner. Fades from the
 *  four straight sides stayed square at a rounded corner while the rim curved away,
 *  and the two read misaligned (Adrian, 2026-10-11).
 *
 *  ONE LIGHT with the edge's line: what the band lifts the picture by is the
 *  line's own strength (`--glass-strength`: the state, the look, the ground's sheen,
 *  glass on glass), worked out by `glassLight` on each layer that lifts (`lit`) as on
 *  the edge, from the same inputs, so line and bend rise and fall together on
 *  either face and the line stays the brightest, crispest thing. A fixed lift with a colour boost of its own
 *  burned a blue sky to cyan and swallowed the line (Adrian, 2026-10-11). No
 *  colour of its own: a bend softens and lifts, it does not saturate.
 *
 *  It STEEPENS into the edge, as a curved surface does: the surface tilts faster
 *  the nearer the edge, so the picture is barely touched until the last few pixels
 *  and then bent hard right at the rim. One blur faded in by one wide mask bent the
 *  edge no harder than 20 px in, an even haze ("the intensity right as we approach
 *  the end doesn't match real glass", Adrian, 2026-10-11). So it is LAYERS, each
 *  reaching less far and bending harder than the one under it (they compound,
 *  each blurring what the last left), the light's crest last: `bendLayers`. Each
 *  layer is `GLASS_BEND` with its filter (`--glass-bend-filter`) and its mask on
 *  `style`. */
export const GLASS_BEND =
  "pointer-events-none [backdrop-filter:var(--glass-bend-filter)] [-webkit-backdrop-filter:var(--glass-bend-filter)]"

/** The layers of the bend for a box of corner `radius` (px) and a `bend` (a
 *  multiple), outermost reach first: what each does to the picture under it (a
 *  backdrop filter) and where (a mask: the box's own rounded outline, stroked and
 *  blurred, so its fade follows the rim round every corner; an SVG with no size of
 *  its own, drawn at the size of the box it masks, its rectangle the box and only
 *  the radius given). From a faint softening reaching about 14 px per unit of bend,
 *  through a harder bend within about 6, to a hard one in the last 2 or 3, then
 *  the CREST, the light the curve gathers against the edge, which lifts the picture
 *  into the edge's fine line by a share of that line's own strength. A `lit` layer
 *  (the softening and the crest, which lift the picture by the light) wears
 *  `glassLight`; the others only bend. */
/** A mask of a box's own rounded outline (corner `radius`, a CSS length the SVG
 *  reads, px or rem, never a percentage, which an SVG reads against itself),
 *  stroked `stroke` px wide (half of it inside the box) and blurred by `blur` px: a
 *  band that follows the edge round every corner, fading inward. An SVG with no
 *  size of its own, drawn at the size of the box it masks. What the bend and the
 *  spill are shaped by. */
function edgeOutline(radius: string, stroke: number, blur: number): string {
  if (radius.includes("%"))
    throw new Error(
      `glass: an edge's radius is a length, never a percentage (got ${radius})`,
    )
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg'><filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='${blur}'/></filter><rect width='100%' height='100%' rx='${radius}' fill='none' stroke='white' stroke-width='${stroke}' filter='url(#b)'/></svg>`,
  )}")`
}

export function bendLayers(
  radius: number,
  bend: number,
): { slot: string; filter: string; mask: string; lit: boolean }[] {
  const outline = (stroke: number, blur: number) =>
    edgeOutline(`${radius}px`, stroke, blur)
  return [
    {
      slot: "soften",
      filter: `blur(${1.2 * bend}px) brightness(calc(1 + 0.008 * var(--glass-strength)))`,
      mask: outline(10 * bend, 7 * bend),
      lit: true,
    },
    {
      slot: "bend",
      filter: `blur(${2.5 * bend}px)`,
      mask: outline(5 * bend, 2.5 * bend),
      lit: false,
    },
    {
      slot: "press",
      filter: `blur(${4 * bend}px)`,
      mask: outline(2.5 * bend, 1 * bend),
      lit: false,
    },
    {
      slot: "crest",
      filter: "blur(0.5px) brightness(calc(1 + 0.047 * var(--glass-strength)))",
      mask: outline(2.5 * bend, 0.8 * bend),
      lit: true,
    },
  ]
}

/** THE SPILL at a glass container's edge, over what it holds: a band of glass
 *  along the inside of its edge that blurs what lies under it, so what runs near
 *  the edge (rows scrolling, a picture) spills its light into the band and round
 *  the corners, as glass carries what is behind it; a box's padding between its
 *  content and its edge is then lit by that content, never a flat strip. No face,
 *  no line: the band is the blur alone, deepest at the edge and gone `width` in,
 *  following the rounded outline (`edgeOutline`). Subtle by default (4px, 10px
 *  in; 12px and 28 spread deep into a picture and ate it, Adrian 2026-10-14).
 *  Never a fade or a strip painted on.
 *
 *  A blur mixes both ways: at a corner where content meets the bare glass, the
 *  glass's own tone also reaches a little into the content. A one-way spill (the
 *  content's light out, never the glass's in) needs the content's light drawn
 *  under it, which no backdrop can do; until then it stays this subtle.
 *
 *  A glass CONTAINER wears it by default (`Panel material="glass"`), so nothing
 *  places it by hand. Placing one: inside the container, over
 *  what it holds and under its front surface and edge (absolute, inset 0, its
 *  corners the container's), with the same `radius` its `GlassEdge` takes. What it
 *  blurs must not be inside a backdrop root of its own (a masked scroller): it lies
 *  beside it, and nothing between it and the container may be one, or its blur
 *  reads nothing. Nor inside a box clipped by `overflow` with uneven or elliptical
 *  corners (`8px 8px 2px 2px`, `8px / 4px`): Chrome clips one through a mask of its
 *  own and drops the spill's, which then blurs everything it covers (measured
 *  2026-10-15, a laptop display's clip); such a box clips with `clip-path: inset(0
 *  round …)`. `--glass-spill-blur` sets the blur. Server-safe. */
export function GlassSpill({
  radius,
  width = 10,
  className,
}: {
  /** The container's corner, a CSS length (never a percentage): the outline the
   *  band follows, the one its `GlassEdge` takes. */
  radius: string
  /** How far in the band reaches, px: the last stretch of what nears the edge,
   *  never into what is being read. */
  width?: number
  className?: string
}) {
  if (!(width > 0))
    throw new Error(`GlassSpill: width is px, more than 0 (got ${width})`)
  // The outline stroked twice the band's width (half of it lies outside the box
  // and is cut there), its inner edge blurred so the blur eases in: it reaches
  // `reach` in, the stroke's inner half and the blur's tail (three of its
  // deviations).
  const mask = edgeOutline(radius, width * 2, width / 3)
  const reach = width * 2
  // A backdrop is blurred over its element's whole box before any mask cuts it,
  // so one layer the size of the container blurred all of it every frame (a
  // 632×475 panel: 300,000 pixels for a band of 10). The band is four strips
  // instead, each blurring only the edge it lies along: the top and the foot as
  // deep as the corner and the band (`side`), the sides between them. Each wears
  // the one mask, sized to the whole container (its `cq` units: the wrapper is
  // the container) and placed where the strip lies in it, so the four draw the
  // band the single layer drew.
  // In the container's own units, never a percentage: a mask's position reads a
  // percentage against the strip, not the container.
  const side = `min(calc(${radius} + ${reach}px), 50cqh)`
  const strip = (
    at: React.CSSProperties,
    position: string,
  ): React.CSSProperties => ({
    ...at,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100cqw 100cqh",
    WebkitMaskSize: "100cqw 100cqh",
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  })
  const blur =
    "absolute [backdrop-filter:blur(var(--glass-spill-blur,4px))_saturate(1.2)] [-webkit-backdrop-filter:blur(var(--glass-spill-blur,4px))_saturate(1.2)]"
  return (
    <div
      aria-hidden
      data-slot="glass-spill"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [container-type:size]",
        className,
      )}
    >
      {/* Rounded as the container is, so no blur shows past its corners: a
          backdrop is clipped by its own element's radius. */}
      <div
        className={blur}
        style={strip(
          {
            top: 0,
            left: 0,
            right: 0,
            height: side,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
          "0 0",
        )}
      />
      <div
        className={blur}
        style={strip(
          {
            bottom: 0,
            left: 0,
            right: 0,
            height: side,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
          },
          "0 100%",
        )}
      />
      <div
        className={blur}
        style={strip(
          { top: side, bottom: side, left: 0, width: reach },
          `0 calc(-1 * ${side})`,
        )}
      />
      <div
        className={blur}
        style={strip(
          { top: side, bottom: side, right: 0, width: reach },
          `100% calc(-1 * ${side})`,
        )}
      />
    </div>
  )
}
