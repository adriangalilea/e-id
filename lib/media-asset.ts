export type MediaAsset = {
  src: string
  kind: "image" | "animation" | "video" | "audio"
  /** pixels; for audio, its picture's (0 when it has none) */
  width: number
  height: number
  mime: string
  bytes: number
  blurDataURL?: string
  poster?: string
  /** seconds */
  duration?: number
  /** the picture's mean colour, `#rrggbb`: what stands in before it loads */
  average?: string
  /** stills along it: frame `i` (from 0, `count` of them) is the picture at
   *  `i × every` seconds, at `src` with `{i}` replaced */
  frames?: { every: number; count: number; src: string }
}

const finite = (n: unknown, min: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min

/** Validate responses at the upload boundary; no framework or storage dependency. */
export function isMediaAsset(value: unknown): value is MediaAsset {
  if (!value || typeof value !== "object") return false
  const a = value as Record<string, unknown>
  const f = a.frames as Record<string, unknown> | undefined
  const sized =
    a.kind === "audio"
      ? [a.width, a.height].every((n) => finite(n, 0))
      : [a.width, a.height].every((n) => finite(n, 0) && (n as number) > 0)
  return (
    typeof a.src === "string" &&
    a.src.length > 0 &&
    ["image", "animation", "video", "audio"].includes(String(a.kind)) &&
    typeof a.mime === "string" &&
    sized &&
    finite(a.bytes, 0) &&
    (a.bytes as number) > 0 &&
    (a.poster === undefined || typeof a.poster === "string") &&
    (a.blurDataURL === undefined || typeof a.blurDataURL === "string") &&
    (a.duration === undefined || finite(a.duration, 0)) &&
    (a.average === undefined ||
      (typeof a.average === "string" && /^#[0-9a-f]{6}$/i.test(a.average))) &&
    (f === undefined ||
      (finite(f.every, 0) &&
        (f.every as number) > 0 &&
        finite(f.count, 1) &&
        typeof f.src === "string" &&
        f.src.includes("{i}")))
  )
}
