// THE HOLO'S PRINTS, framework-free: what a hologram is made of, drawn from
// geometry as SVG, for a stylesheet to use as MASKS (white where the print is)
// over e-id's foil (`--foil`, globals.css). A print is never a wash of colour: a
// smooth gradient this faint over a dark ground bands into mud in eight bits,
// where fine lines lit by a band of foil stay crisp. A surface wears the prints
// as custom properties (`HOLO_PRINTS`); which it shows, where the band of light
// is (`--px`, from a Tilt) and how strongly are the stylesheet's (`id-card-holo`,
// `data-cta`). Each is from a fixed seed or pure geometry, so the server and the
// browser draw the same, and the share image (lib/card-image) draws the same
// prints from the same geometry (`HOLO_ART`).

import { MARK_PATH } from "@/lib/mark";

/** A print as SVG: its tile's size and what is drawn in it, white on nothing. */
export type HoloArt = { width: number; height: number; body: string };

function art(width: number, height: number, body: string): HoloArt {
  return { width, height, body };
}

function svgUrl({ width, height, body }: HoloArt): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** A seeded random, the same sequence for the same seed everywhere (mulberry32). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** GUILLOCHÉ, the line work of banknotes: five sine waves a fifth of a turn apart,
 *  one period every 80 px, in a band 40 px tall, a tile that repeats seamlessly
 *  across and stacks into ribbons down. */
function guilloche(): HoloArt {
  const W = 160;
  const H = 40;
  const waves = Array.from({ length: 5 }, (_, i) => {
    const phase = (i * 2 * Math.PI) / 5;
    const points = Array.from({ length: W / 2 + 1 }, (_, k) => {
      const x = k * 2;
      const y = H / 2 + 9 * Math.sin((2 * Math.PI * x) / 80 + phase);
      return `${x},${y.toFixed(2)}`;
    });
    return `<polyline points="${points.join(" ")}" fill="none" stroke="#fff" stroke-width="0.45"/>`;
  });
  return art(W, H, waves.join(""));
}

/** EMBLEMS: the mark, 10 px, twice in a 72 px tile, staggered, a texture. */
function emblems(): HoloArt {
  const at = (x: number, y: number) =>
    `<path transform="translate(${x} ${y}) scale(0.42)" d="${MARK_PATH}" fill="#fff"/>`;
  return art(72, 72, at(8, 8) + at(44, 44));
}

/** A SEAL: two rings, a rosette of 48 ticks between them, the mark at its heart. */
function seal(): HoloArt {
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 48;
    const p = (r: number) =>
      `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(31)}L${p(40)}`;
  });
  return art(
    100,
    100,
    `<circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="1.2"/>` +
      `<circle cx="50" cy="50" r="28" fill="none" stroke="#fff" stroke-width="0.8"/>` +
      `<path d="${ticks.join("")}" stroke="#fff" stroke-width="0.6"/>` +
      `<path transform="translate(32 32) scale(1.5)" d="${MARK_PATH}" fill="#fff"/>`,
  );
}

/** THE WEB, people linked: nodes on a jittered grid (so they spread rather than
 *  clump), each joined to its two nearest, a few hubs joined to four and drawn as
 *  the mark in a ring. Drawn once at an ID card's proportions (100 across) and laid
 *  over a surface whole, not tiled. */
function web(): HoloArt {
  const W = 100;
  const H = (100 * 53.98) / 85.6;
  const random = seeded(19);
  const COLS = 9;
  const ROWS = 6;
  const nodes = Array.from({ length: COLS * ROWS }, (_, i) => ({
    x: ((i % COLS) + 0.15 + random() * 0.7) * (W / COLS),
    y: (Math.floor(i / COLS) + 0.15 + random() * 0.7) * (H / ROWS),
    hub: random() < 0.12,
  }));
  const edges = new Set<string>();
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j }) => j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, a.hub ? 4 : 2);
    for (const { j } of nearest) edges.add(i < j ? `${i}-${j}` : `${j}-${i}`);
  });
  const f = (n: number) => n.toFixed(2);
  const lines = [...edges].map((key) => {
    const [i, j] = key.split("-").map(Number);
    const a = nodes[i];
    const b = nodes[j];
    if (!a || !b) throw new Error(`web: edge ${key} names a missing node`);
    return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  });
  const dots = nodes.map((n) =>
    n.hub
      ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="2.3" fill="none" stroke="#fff" stroke-width="0.14"/>` +
        `<path transform="translate(${f(n.x - 1.5)} ${f(n.y - 1.6)}) scale(0.125)" d="${MARK_PATH}" fill="#fff"/>`
      : `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="0.35" fill="#fff"/>`,
  );
  return art(
    W,
    H,
    `<path d="${lines.join("")}" stroke="#fff" stroke-width="0.12" fill="none"/>${dots.join("")}`,
  );
}

/** The prints, drawn once. */
export const HOLO_ART = {
  guilloche: guilloche(),
  emblems: emblems(),
  web: web(),
  seal: seal(),
};

/** The prints as the custom properties a surface wears to carry them. */
export const HOLO_PRINTS = {
  "--holo-guilloche": svgUrl(HOLO_ART.guilloche),
  "--holo-emblems": svgUrl(HOLO_ART.emblems),
  "--holo-web": svgUrl(HOLO_ART.web),
  "--holo-seal": svgUrl(HOLO_ART.seal),
} as Record<`--holo-${string}`, string>;

/** Which print a card's hologram carries: the laminate (guilloché and emblems), or
 *  the web (people linked). Both carry the seal. */
export type HoloPrint = "laminate" | "web";
