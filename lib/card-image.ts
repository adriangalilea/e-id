import "server-only";

import { join } from "node:path";
import { CARD_LAYOUT } from "@/lib/card-layout";
import { fetchPhoto } from "@/lib/photo";
import { Resvg } from "@resvg/resvg-js";
import * as FLAGS from "country-flag-icons/string/3x2";
import { __iconNode as circleDotDashed } from "lucide-react/dist/esm/icons/circle-dot-dashed.js";
import { __iconNode as contactRound } from "lucide-react/dist/esm/icons/contact-round.js";
import { __iconNode as github } from "lucide-react/dist/esm/icons/github.js";
import { __iconNode as instagram } from "lucide-react/dist/esm/icons/instagram.js";
import { __iconNode as linkIcon } from "lucide-react/dist/esm/icons/link.js";
import { __iconNode as link2 } from "lucide-react/dist/esm/icons/link-2.js";
import { __iconNode as mail } from "lucide-react/dist/esm/icons/mail.js";
import { __iconNode as send } from "lucide-react/dist/esm/icons/send.js";
import { __iconNode as twitter } from "lucide-react/dist/esm/icons/twitter.js";
import { __iconNode as youtube } from "lucide-react/dist/esm/icons/youtube.js";
import type { LinkPlatform } from "@/db/schema";
import { type Card, knownPlatform } from "@/lib/card-schema";
import { EMOJI_DOMAIN } from "@/lib/const";
import { FOIL as FOIL_SPEC } from "@/lib/foil";
import { HOLO_ART, type HoloArt } from "@/lib/holo";
import { MARK_BOX, MARK_PATH } from "@/lib/mark";
import { nameFit } from "@/lib/name-fit";

// THE SHARE IMAGE: a person's card (lib/card) drawn as the card the profile shows,
// as one SVG, rasterised by resvg. The same geometry as components/id-card, every
// length a share of the card's width (`u`, its cqw), the same prints (lib/holo),
// lit as a hand holding the card would light them. Text is measured by the
// renderer that draws it, with the site's own fonts (assets/fonts, OFL), so a name
// wraps and a handle truncates where they really end.

export const SHARE_SIZE = { width: 1200, height: 630 };

const FONTS = ["SpaceGrotesk-Regular.ttf", "SpaceGrotesk-Medium.ttf", "SpaceMono-Regular.ttf"].map(
  (file) => join(process.cwd(), "assets/fonts", file),
);
const RESVG_FONT = { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Space Grotesk" };
const SANS = "Space Grotesk";
const MONO = "Space Mono";

/** The page and the card, the site's dark (`--background`, `--foreground`, globals.css). */
const PAGE = "#060606";
const INK = "#f5f5f5";

/** THE FOIL, lib/foil's stops (one OKLCH lightness and chroma, only the hue
 *  turning), written here as sRGB since that is what resvg takes. */
const FOIL = FOIL_SPEC.hues.map((hue) => oklchHex(FOIL_SPEC.lightness, FOIL_SPEC.chroma, hue));

/** Where the light lies across the card, as a hand tilting it would put it (`--px`):
 *  a third of the way in, on the photo's edge, so the band crosses the seal. */
const LIGHT = 0.36;

type IconNode = [string, Record<string, string>][];
/** Each platform's glyph, as the site draws it (lib/links, `getLinkIcon`). */
const ICONS: Record<LinkPlatform, IconNode> = {
  website: linkIcon,
  link: link2,
  email: mail,
  github,
  twitter,
  youtube,
  instagram,
  self: circleDotDashed,
  telegram: send,
};

function oklchHex(L: number, C: number, hue: number): string {
  const a = C * Math.cos((hue * Math.PI) / 180);
  const b = C * Math.sin((hue * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear
    .map((x) => {
      const c = Math.min(1, Math.max(0, x));
      const g = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(g * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n: number) => Number(n.toFixed(2));

/** A CSS `linear-gradient(<angle>deg, …)` over a box, as an SVG gradient's ends: the
 *  line through the box's centre at that angle, long enough that its ends' normals
 *  touch the far corners (CSS's own definition). */
function cssLine(angle: number, x: number, y: number, w: number, h: number) {
  const r = (angle * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = -Math.cos(r);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `x1="${f(cx - dx * half)}" y1="${f(cy - dy * half)}" x2="${f(cx + dx * half)}" y2="${f(cy + dy * half)}" gradientUnits="userSpaceOnUse"`;
}

const foilStops = () =>
  FOIL.map((c, i) => `<stop offset="${f(i / (FOIL.length - 1))}" stop-color="${c}"/>`).join("");

/** How wide `text` sets, in px: the renderer's own measure of it. */
function measure(text: string, family: string, weight: number, size: number): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * text.length * 2}" height="${size * 2}"><text x="0" y="${size}" font-family="${family}" font-weight="${weight}" font-size="${size}">${esc(text)}</text></svg>`;
  const box = new Resvg(svg, { font: RESVG_FONT }).getBBox();
  return box ? box.x + box.width : 0;
}

/** Lines of at most `width`, at most `max` of them, the last cut with an ellipsis. */
function wrap(text: string, width: number, max: number, fits: (s: string) => boolean): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next) || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > max) lines.splice(max - 1, lines.length, lines.slice(max - 1).join(" "));
  return lines.map((l) => (fits(l) ? l : cut(l, fits)));
}

/** The longest start of `text` that fits with an ellipsis after it. */
function cut(text: string, fits: (s: string) => boolean): string {
  let n = text.length;
  while (n > 1 && !fits(`${text.slice(0, n).trimEnd()}…`)) n--;
  return `${text.slice(0, n).trimEnd()}…`;
}

/** The mark (lib/mark), its own box `size` tall, its foot on `y`. */
function mark(x: number, y: number, size: number, fill: string): string {
  const k = size / MARK_BOX.h;
  return `<path transform="translate(${f(x - MARK_BOX.x * k)} ${f(y - size - MARK_BOX.y * k)}) scale(${f(k)})" d="${MARK_PATH}" fill="${fill}"/>`;
}

function icon(
  node: IconNode,
  x: number,
  y: number,
  size: number,
  stroke = `stroke="${INK}" stroke-width="1.4"`,
  /** How dim it is, on the glyph's group: as one shape, so its crossing strokes
   *  never paint twice (a `stroke-opacity` dims each stroke on its own). */
  opacity = 0.7,
): string {
  const parts = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${esc(String(v))}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(size / 24)})" fill="none" ${stroke} opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round">${parts}</g>`;
}

const dataUri = (mime: string, bytes: Uint8Array) =>
  `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

/** The person's photo as a data URI resvg can draw, or null. */
async function photoOf(url: string | null): Promise<string | null> {
  // PNG, JPEG and GIF, which is what resvg reads too.
  const photo = await fetchPhoto(url, "share image");
  return photo && dataUri(photo.mime, photo.bytes);
}

function pattern(id: string, a: HoloArt): string {
  return `<pattern id="${id}" width="${a.width}" height="${a.height}" patternUnits="userSpaceOnUse">${a.body}</pattern>`;
}

/** Where the card is drawn: `share`, the share image (1200 by 630, the card on the
 *  page's ground, its light still); `card`, the card alone, its box the drawing's,
 *  for the embed (public/embed.js) to set on any page and light by the hand: its
 *  links' glyphs and its name are anchors, and what the hand moves is named
 *  (`LIGHT_HOOKS`). */
export type CardFrame = "share" | "card";

/** The card's width in the drawing, the unit everything on it is a share of. */
const CARD_W = 760;

/** What the embed moves as the hand moves: the band of light (its gradient's four
 *  stops, at the light ∓ 40% and ∓ 8%), the foil under it (shifted across, as
 *  `background-position` shifts the site's), and how strongly the print shows. */
export const LIGHT_HOOKS = {
  band: "band",
  foil: "foil",
  holo: "holo",
  light: LIGHT,
  /** How far the foil moves for the light going from 0 to 1, in drawing units. */
  foilTravel: 3 * CARD_W,
} as const;

/** The card as SVG. */
export async function cardSvg(card: Card, frame: CardFrame = "share"): Promise<string> {
  const share = frame === "share";
  // The card, ID-1 (85.6 by 53.98 mm, corners 3.18). In the share image, centred,
  // three quarters as tall as the image: the image is the card.
  const cw = CARD_W;
  const ch = (cw * 53.98) / 85.6;
  const W = share ? SHARE_SIZE.width : cw;
  const H = share ? SHARE_SIZE.height : ch;
  const u = cw / 100;
  const cx = (W - cw) / 2;
  const cy = (H - ch) / 2;
  const anchor = (href: string, body: string, link?: { name: string; at: number }) =>
    share
      ? body
      : // `data-link`: the link's index in `card.links`, whose profile the embed
        // shows.
        `<a href="${esc(href)}" target="_blank" rel="me noopener"${link ? ` aria-label="${esc(link.name)}" data-link="${link.at}"` : ""}>${body}</a>`;
  const radius = (3.18 / 85.6) * cw;
  const L = CARD_LAYOUT;
  const pad = L.pad * u;
  const at = (x: number, y: number) => [cx + x * u, cy + y * u] as const;

  // The body: the head alone above, the photo and the words beside it centred in
  // the room under it (lib/card-layout, as components/id-card lays it out).
  const headLine = 1.5 * L.head;
  const bodyTop =
    L.pad + headLine + (63.06 - L.pad - (L.pad + headLine) - L.photo) / 2;
  const bodyFoot = bodyTop + L.photo;
  const photoX = L.pad;
  const textX = photoX + L.photo + L.gap;
  const textWidth = (100 - L.pad - textX) * u;

  const photo = await photoOf(card.photo);

  // On one line whenever it can be, as the site's card sets it (lib/name-fit).
  const fit = nameFit(card.name, 100 - L.pad - textX, L.name);
  const nameSize = fit.size * u;
  const nameFits = (s: string) => measure(s, SANS, 500, nameSize) <= textWidth;
  const nameLines =
    fit.lines === 1 ? [card.name] : wrap(card.name, textWidth, 2, nameFits);
  const lineStep = 1.02 * nameSize;

  // The words beside the photo, as tall as it (components/id-card): the name
  // and the links' glyphs sharing its height, spaced round each (CSS's
  // `justify-content: space-around`). The name's box is its capitals to its
  // last baseline (the site trims it so).
  const nameH = 0.7 * nameSize + (nameLines.length - 1) * lineStep;
  const iconH = L.icon * u;
  const around = ((bodyFoot - bodyTop) * u - nameH - iconH) / 2;
  const nameTop = cy + bodyTop * u + around / 2;
  const iconTop = nameTop + nameH + around;

  // A card this site wrote: every platform on it is one it draws.
  const links = card.links.map((l, at) => ({ ...l, at, platform: knownPlatform(l.platform) }));
  const shown = links.slice(0, Math.floor((textWidth + 0.6 * u) / (L.iconStep * u)));
  // Spread across the column, the first glyph at its left and the last at its
  // right, each link at most its slot (lib/card-layout `iconSlot`, its hit area
  // included), as the site's row is.
  const rowW = Math.min(textWidth, (shown.length * L.iconSlot - 2.2) * u);
  const step = shown.length > 1 ? (rowW - iconH) / (shown.length - 1) : 0;
  const flair = shown.length
    ? shown
        .map((l, i) => {
          const x = cx + textX * u + i * step;
          const y = iconTop;
          // The hit area is the icon's padded square, as on the site.
          const hit = `<rect x="${f(x - 1.1 * u)}" y="${f(y - 1.1 * u)}" width="${f((L.icon + 2.2) * u)}" height="${f((L.icon + 2.2) * u)}" rx="${f(1.2 * u)}" fill="#fff" fill-opacity="0"/>`;
          return anchor(l.url, hit + icon(ICONS[l.platform], x, y, L.icon * u), {
            name: l.name,
            at: l.at,
          });
        })
        .join("")
    : "";

  const name = nameLines
    .map((line, i) => {
      // The first line's capitals start at the name's top (a cap is about 0.7
      // of the type's size).
      const base = nameTop + 0.7 * nameSize + i * lineStep;
      return `<text x="${f(cx + textX * u)}" y="${f(base)}" font-family="${SANS}" font-weight="500" font-size="${f(nameSize)}" letter-spacing="${f(-0.03 * nameSize)}" fill="${INK}">${esc(line)}</text>`;
    })
    .join("");

  // The head: the address on the left, the country and its flag on the right.
  const headBase = L.pad + 1.08 * L.head;
  const headSize = L.head * u;
  const flag = card.country ? (FLAGS as Record<string, string>)[card.country] : undefined;
  const flagH = L.flag * u * 0.7;
  const flagW = flagH * 1.5;
  const [hx, hy] = at(100 - L.pad, headBase);
  const markSize = headSize * 0.72;
  const tail = `.${EMOJI_DOMAIN.split(".").slice(1).join(".")}/${card.handle}`;
  const tailRoom =
    (100 - 2 * L.pad) * u - markSize - 0.15 * headSize - (flag ? flagW + 9 * u : 0);
  const tailFits = (s: string) => measure(s, MONO, 400, headSize) <= tailRoom;
  const tailText = tailFits(tail) ? tail : cut(tail, tailFits);
  const address = anchor(
    card.id,
    mark(cx + pad, hy, markSize, INK) +
      `<text x="${f(cx + pad + markSize + 0.15 * headSize)}" y="${f(hy)}" font-family="${MONO}" font-size="${f(headSize)}" fill="${INK}" fill-opacity="0.6">${esc(tailText)}</text>`,
  );
  const head =
    address +
    (flag
      ? `<image href="${dataUri("image/svg+xml", new TextEncoder().encode(flag))}" x="${f(hx - flagW)}" y="${f(hy - flagH)}" width="${f(flagW)}" height="${f(flagH)}" preserveAspectRatio="none"/>` +
        `<rect x="${f(hx - flagW)}" y="${f(hy - flagH)}" width="${f(flagW)}" height="${f(flagH)}" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="1"/>` +
        `<text x="${f(hx - flagW - 1.5 * u)}" y="${f(hy)}" text-anchor="end" font-family="${MONO}" font-size="${f(headSize)}" fill="${INK}" fill-opacity="0.6">${esc(card.country ?? "")}</text>`
      : "");

  // The photo, and its ghost: the same face again as a line-screened print in the
  // card's corner, dissolving at its edges.
  const [px, py] = at(photoX, bodyTop);
  const ps = 30 * u;
  const portrait = photo
    ? `<image href="${photo}" x="${f(px)}" y="${f(py)}" width="${f(ps)}" height="${f(ps)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>`
    : `<g opacity="0.15">${mark(px + ps / 2 - (ps / 2) * (MARK_BOX.w / MARK_BOX.h) / 2, py + ps * 0.75, ps / 2, "#fff")}</g>`;
  // The card's own save, in its foot's corner on the inner margin, mirroring
  // the country at its head: `vCard` and the contact glyph in the head's type,
  // engraved (components/save-contact `CardSave`): cut darker than the card,
  // opaque, its lower edge a light hairline (a light copy a pixel lower, under
  // it). On the card set on a page, where it can be pressed, not on the share
  // image.
  const saveIcon = 1.15 * headSize;
  const saveBase = cy + ch - pad - 0.25 * headSize;
  const saveIconX = cx + cw - pad - saveIcon;
  const engraved = (ink: string, dy: number, opacity: number) =>
    `<g transform="translate(0 ${dy})" opacity="${opacity}">` +
    `<text x="${f(saveIconX - 1.2 * u)}" y="${f(saveBase)}" text-anchor="end" font-family="${MONO}" font-size="${f(headSize)}" fill="${ink}">vCard</text>` +
    icon(contactRound, saveIconX, saveBase - 0.36 * headSize - saveIcon / 2, saveIcon, `stroke="${ink}" stroke-width="1.5"`, 1) +
    "</g>";
  const save = share
    ? ""
    : `<a href="${esc(card.formats.vcard)}" download="${esc(card.handle)}.vcf" aria-label="save contact (vCard)"><title>save contact</title>` +
      engraved("#fff", 1, 0.16) +
      engraved("#050506", 0, 1) +
      "</a>";
  const [gx, gy] = at(100 - 2 - 34, 6);
  const gs = 34 * u;
  const ghost = photo
    ? `<image href="${photo}" x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" preserveAspectRatio="xMidYMid slice" filter="url(#ghost)" mask="url(#ghost-mask)" opacity="0.3"/>`
    : "";

  // The hologram, lit: the laminate's line work and the seal, in the foil, shown
  // only in the band of light.
  const sealSize = 14 * u;
  const [sx, sy] = at(29, 63.06 - 37 - 14);
  const band = LIGHT * 100;
  const foilBox = { x: cx - LIGHT_HOOKS.foilTravel * LIGHT, w: 4 * cw };
  // Face on, the print is nearly invisible (the site's 0.06); the share image is the
  // card in a hand, lit (0.26), as it is under the hand.
  const holoStrength = share ? 0.26 : 0.06;
  const edge = share ? cssLine(115, 0, 0, W, H) : cssLine(115, cx, cy, cw, ch);

  const page = share
    ? `<rect width="${W}" height="${H}" fill="${PAGE}"/>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<rect width="${W}" height="${H}" fill="url(#beam)"/>
<rect x="${f(cx)}" y="${f(cy + 3 * u)}" width="${f(cw)}" height="${f(ch)}" rx="${f(radius)}" fill="#000" fill-opacity="0.65" filter="url(#lift)"/>`
    : "";
  const grain = share ? `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.045"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${f(W)} ${f(H)}"${share ? "" : ` role="group" aria-label="${esc(`${card.name}'s e-ID card`)}"`}>
<defs>
  <radialGradient id="beam" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${W / 2} ${f(-0.06 * H)}) scale(${f(0.12 * W)} ${f(0.55 * H)})"><stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="halo" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${W / 2} ${f(-0.12 * H)}) scale(${f(0.42 * W)} ${f(0.75 * H)})"><stop offset="0" stop-color="#fff" stop-opacity="0.055"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="body" ${cssLine(135, cx, cy, cw, ch)}><stop offset="0" stop-color="#1e1e21"/><stop offset="0.55" stop-color="#131315"/><stop offset="1" stop-color="#0d0d0e"/></linearGradient>
  <linearGradient id="rim" ${cssLine(135, cx, cy, cw, ch)}><stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.75" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0.18"/></linearGradient>
  <linearGradient id="foil" ${cssLine(115, foilBox.x, cy, foilBox.w, ch)}>${foilStops()}</linearGradient>
  <linearGradient id="edge-foil" ${edge}>${foilStops()}</linearGradient>
  <linearGradient id="band" ${cssLine(115, cx, cy, cw, ch)}><stop offset="${f(Math.max(0, band - 40) / 100)}" stop-color="#fff" stop-opacity="0"/><stop offset="${f((band - 8) / 100)}" stop-color="#fff"/><stop offset="${f((band + 8) / 100)}" stop-color="#fff"/><stop offset="${f(Math.min(100, band + 40) / 100)}" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="ghost-fade" cx="0.5" cy="0.5" r="0.5"><stop offset="0.35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  ${pattern("guilloche", HOLO_ART.guilloche)}
  ${pattern("emblems", HOLO_ART.emblems)}
  <pattern id="screen" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#fff"/></pattern>
  <clipPath id="card"><rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" rx="${f(radius)}"/></clipPath>
  <clipPath id="photo"><rect x="${f(px)}" y="${f(py)}" width="${f(ps)}" height="${f(ps)}" rx="${f(1.4 * u)}"/></clipPath>
  <mask id="screen-mask"><rect x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" fill="url(#screen)"/></mask>
  <mask id="ghost-mask"><g mask="url(#screen-mask)"><rect x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" fill="url(#ghost-fade)"/></g></mask>
  <filter id="ghost" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.25" intercept="-0.125"/><feFuncG type="linear" slope="1.25" intercept="-0.125"/><feFuncB type="linear" slope="1.25" intercept="-0.125"/></feComponentTransfer></filter>
  <mask id="band-mask"><rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="url(#band)"/></mask>
  <mask id="laminate"><rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="url(#guilloche)"/><rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="url(#emblems)"/></mask>
  <mask id="seal"><g transform="translate(${f(sx)} ${f(sy)}) scale(${f(sealSize / HOLO_ART.seal.width)})">${HOLO_ART.seal.body}</g></mask>
  <!-- The card's shadow is its own shape, blurred: a drop shadow filter on the
       body made resvg draw the body's gradient in hard steps. -->
  <filter id="lift" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="${f(4 * u)}"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
${page}
<rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" rx="${f(radius)}" fill="url(#body)"/>
<g clip-path="url(#card)">
  ${ghost}
  <g id="holo" mask="url(#band-mask)" opacity="${holoStrength}" style="mix-blend-mode:screen">
    <rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="url(#foil)" mask="url(#laminate)"/>
    <rect x="${f(cx)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" fill="url(#foil)" mask="url(#seal)"/>
  </g>
  <rect x="${f(px)}" y="${f(py)}" width="${f(ps)}" height="${f(ps)}" rx="${f(1.4 * u)}" fill="#fff" fill-opacity="0.05" stroke="#fff" stroke-opacity="0.08"/>
  ${portrait}
  ${head}
  ${anchor(card.id, name)}
  ${flair}
</g>
<rect x="${f(cx + 0.5)}" y="${f(cy + 0.5)}" width="${f(cw - 1)}" height="${f(ch - 1)}" rx="${f(radius - 0.5)}" fill="none" stroke="url(#rim)" pointer-events="none"/>
<rect x="${f(cx + 0.5)}" y="${f(cy + 0.5)}" width="${f(cw - 1)}" height="${f(ch - 1)}" rx="${f(radius - 0.5)}" fill="none" stroke="url(#edge-foil)" stroke-opacity="0.16" pointer-events="none"/>
${save}
${grain}
</svg>`;
}

/** The compact card's height in the drawing: every length on it is a share of it
 *  (`v`, a hundredth). */
const COMPACT_H = 120;

/** THE COMPACT CARD, the byline (`<e-id-card compact>`): the card made small for
 *  the foot of something someone made. The same body, rim, foil edge and laminate
 *  hologram as the card, lit by the same hooks (`LIGHT_HOOKS`: its foil laid at
 *  the card's own scale, so it moves as the card's does); the photo, the name on
 *  one line and the address under it, the box as wide as they need. All of it is
 *  one link, to the profile. */
export async function compactSvg(card: Card): Promise<string> {
  const H = COMPACT_H;
  const v = H / 100;
  const pad = 16 * v;
  const ps = H - 2 * pad;
  const textX = pad + ps + 14 * v;
  const nameSize = 27 * v;
  const headSize = 15 * v;
  const markSize = headSize * 0.72;
  const tail = `.${EMOJI_DOMAIN.split(".").slice(1).join(".")}/${card.handle}`;
  // The two lines centred on the photo: the name's capitals (0.7 of its size)
  // and the address's (its mark's height), 13 apart.
  const gap = 13 * v;
  const block = 0.7 * nameSize + gap + markSize;
  const nameBase = (H - block) / 2 + 0.7 * nameSize;
  const tailBase = nameBase + gap + markSize;
  // As wide as its longer line, kept to a byline's length.
  const room = 520 * v;
  const nameFits = (s: string) => measure(s, SANS, 500, nameSize) <= room;
  const nameText = nameFits(card.name) ? card.name : cut(card.name, nameFits);
  const tailW = markSize + 0.15 * headSize + measure(tail, MONO, 400, headSize);
  const W = textX + Math.max(measure(nameText, SANS, 500, nameSize), tailW) + 22 * v;
  const radius = 14 * v;
  const photo = await photoOf(card.photo);
  const portrait = photo
    ? `<image href="${photo}" x="${f(pad)}" y="${f(pad)}" width="${f(ps)}" height="${f(ps)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>`
    : `<g opacity="0.15">${mark(pad + ps / 2 - (ps / 2) * (MARK_BOX.w / MARK_BOX.h) / 2, pad + ps * 0.75, ps / 2, "#fff")}</g>`;
  // The ghost, as on the card: the same face again, line-screened, dissolving,
  // at the strip's far end behind the words, a little taller than the strip as
  // the card's is taller than its photo.
  const gs = 1.15 * H;
  const gx = W - gs + 0.1 * gs;
  const gy = (H - gs) / 2;
  const ghost = photo
    ? `<image href="${photo}" x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" preserveAspectRatio="xMidYMid slice" filter="url(#ghost)" mask="url(#ghost-mask)" opacity="0.3"/>`
    : "";
  const band = LIGHT * 100;
  const foilBox = { x: -LIGHT_HOOKS.foilTravel * LIGHT, w: 4 * CARD_W };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${H}" viewBox="0 0 ${f(W)} ${H}" role="group" aria-label="${esc(`${card.name}'s e-ID`)}">
<defs>
  <radialGradient id="ghost-fade" cx="0.5" cy="0.5" r="0.5"><stop offset="0.35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <pattern id="screen" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#fff"/></pattern>
  <mask id="screen-mask"><rect x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" fill="url(#screen)"/></mask>
  <mask id="ghost-mask"><g mask="url(#screen-mask)"><rect x="${f(gx)}" y="${f(gy)}" width="${f(gs)}" height="${f(gs)}" fill="url(#ghost-fade)"/></g></mask>
  <filter id="ghost" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.25" intercept="-0.125"/><feFuncG type="linear" slope="1.25" intercept="-0.125"/><feFuncB type="linear" slope="1.25" intercept="-0.125"/></feComponentTransfer></filter>
  <linearGradient id="body" ${cssLine(135, 0, 0, W, H)}><stop offset="0" stop-color="#1e1e21"/><stop offset="0.55" stop-color="#131315"/><stop offset="1" stop-color="#0d0d0e"/></linearGradient>
  <linearGradient id="rim" ${cssLine(135, 0, 0, W, H)}><stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.75" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0.18"/></linearGradient>
  <linearGradient id="foil" ${cssLine(115, foilBox.x, 0, foilBox.w, H)}>${foilStops()}</linearGradient>
  <linearGradient id="edge-foil" ${cssLine(115, 0, 0, W, H)}>${foilStops()}</linearGradient>
  <linearGradient id="band" ${cssLine(115, 0, 0, W, H)}><stop offset="${f(Math.max(0, band - 40) / 100)}" stop-color="#fff" stop-opacity="0"/><stop offset="${f((band - 8) / 100)}" stop-color="#fff"/><stop offset="${f((band + 8) / 100)}" stop-color="#fff"/><stop offset="${f(Math.min(100, band + 40) / 100)}" stop-color="#fff" stop-opacity="0"/></linearGradient>
  ${pattern("guilloche", HOLO_ART.guilloche)}
  ${pattern("emblems", HOLO_ART.emblems)}
  <clipPath id="card"><rect width="${f(W)}" height="${H}" rx="${f(radius)}"/></clipPath>
  <clipPath id="photo"><rect x="${f(pad)}" y="${f(pad)}" width="${f(ps)}" height="${f(ps)}" rx="${f(8 * v)}"/></clipPath>
  <mask id="band-mask"><rect width="${f(W)}" height="${H}" fill="url(#band)"/></mask>
  <mask id="laminate"><rect width="${f(W)}" height="${H}" fill="url(#guilloche)"/><rect width="${f(W)}" height="${H}" fill="url(#emblems)"/></mask>
</defs>
<a href="${esc(card.id)}" target="_blank" rel="me noopener">
<rect width="${f(W)}" height="${H}" rx="${f(radius)}" fill="url(#body)"/>
<g clip-path="url(#card)">
  ${ghost}
  <g id="${LIGHT_HOOKS.holo}" mask="url(#band-mask)" opacity="0.06" style="mix-blend-mode:screen">
    <rect width="${f(W)}" height="${H}" fill="url(#foil)" mask="url(#laminate)"/>
  </g>
  <rect x="${f(pad)}" y="${f(pad)}" width="${f(ps)}" height="${f(ps)}" rx="${f(8 * v)}" fill="#fff" fill-opacity="0.05" stroke="#fff" stroke-opacity="0.08"/>
  ${portrait}
  <text x="${f(textX)}" y="${f(nameBase)}" font-family="${SANS}" font-weight="500" font-size="${f(nameSize)}" letter-spacing="${f(-0.03 * nameSize)}" fill="${INK}">${esc(nameText)}</text>
  ${mark(textX, tailBase, markSize, INK)}
  <text x="${f(textX + markSize + 0.15 * headSize)}" y="${f(tailBase)}" font-family="${MONO}" font-size="${f(headSize)}" fill="${INK}" fill-opacity="0.6">${esc(tail)}</text>
</g>
<rect x="0.5" y="0.5" width="${f(W - 1)}" height="${H - 1}" rx="${f(radius - 0.5)}" fill="none" stroke="url(#rim)" pointer-events="none"/>
<rect x="0.5" y="0.5" width="${f(W - 1)}" height="${H - 1}" rx="${f(radius - 0.5)}" fill="none" stroke="url(#edge-foil)" stroke-opacity="0.16" pointer-events="none"/>
</a>
</svg>`;
}

/** The card as the PNG a link preview shows. */
export async function cardPng(card: Card): Promise<Uint8Array> {
  const svg = await cardSvg(card);
  return new Resvg(svg, { font: RESVG_FONT, fitTo: { mode: "original" } }).render().asPng();
}
