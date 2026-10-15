import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import sharp from "sharp"
import type { MediaAsset } from "@/lib/media-asset"

const exec = promisify(execFile)

/** What is prepared: its bytes, a file on disk, or a file on another host. */
export type MediaInput =
  | Buffer
  | { path: string }
  | { url: string; headers?: Record<string, string> }

export type PreparedMedia = {
  asset: Omit<MediaAsset, "src" | "poster" | "frames"> & {
    /** the frames' names, `{i}` the index: `mediaAsset` resolves them */
    frames?: { every: number; count: number; name: string }
  }
  files: {
    role: "source" | "poster" | "frame"
    name: string
    mime: string
    data: Buffer
  }[]
}

export type PrepareOptions = {
  /** The most bytes an input held in memory may have (an upload). */
  maxBytes?: number
  maxPixels?: number
  /** Enable video preparation. Requires ffmpeg/ffprobe on PATH. */
  video?: boolean
  /** Keep sound in the prepared video. Preview components still play muted. */
  audio?: boolean
  /** Prepare the sound alone, as AAC in MP4 (`kind: "audio"`), its picture (when the
   *  source has one) as the poster. Implies `video`. */
  audioOnly?: boolean
  posterFormat?: "webp" | "jpeg"
  /** A chosen video poster time, clamped to the clip duration. */
  posterTime?: number
  /** Prepare a silent forward/reverse video from a GIF or video up to 10 seconds.
   * Explicitly enables FFmpeg processing; ordinary images remain untouched. Left
   * unset, a video is prepared as it plays. */
  playback?: "boomerang"
  /** The part of a video or sound kept, in seconds of the source. */
  span?: { from: number; to: number }
  /** A still every `every` seconds of the prepared clip, `width` px wide (480). */
  frames?: { every: number; width?: number }
  /** The longest side of a prepared video, px (1920). */
  maxSide?: number
  signal?: AbortSignal
}

/** The longest a prepared video or sound may run, seconds. */
const MAX_SECONDS = 600

async function preview(
  data: Buffer,
  maxPixels: number,
  format: "webp" | "jpeg" = "webp",
) {
  const image = sharp(data, { limitInputPixels: maxPixels }).rotate()
  const poster = await image
    .clone()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(format, { quality: 82 })
    .toBuffer()
  // PNG keeps transparency. Blur belongs to presentation, not a lossy preprocessing pass.
  const tiny = await image
    .clone()
    .resize({ width: 16, height: 16, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
  return {
    poster,
    mime: `image/${format}`,
    ext: format === "jpeg" ? "jpg" : "webp",
    blurDataURL: `data:image/png;base64,${tiny.toString("base64")}`,
    average: await averageOf(data, maxPixels),
  }
}

/** A picture's mean colour as `#rrggbb`, flattened over black: what a cell shows
 *  before the picture, and the colour anything drawn from it is tinted by (a
 *  quote's ground, a contact's poster). A true mean of every pixel (a 1×1 resize
 *  only estimates one), so the Swift preparer's CIAreaAverage gives the same
 *  colour. The one measure of it: a picture that is not prepared (an avatar
 *  fetched at request time) is measured here too. */
export async function averageOf(
  data: Buffer | Uint8Array,
  maxPixels = 40_000_000,
): Promise<string> {
  const { channels } = await sharp(data, { limitInputPixels: maxPixels })
    .flatten()
    .stats()
  return `#${channels
    .slice(0, 3)
    .map((c) => Math.round(c.mean).toString(16).padStart(2, "0"))
    .join("")}`
}

/** An input as bytes, for the image path. */
async function bytesOf(
  input: MediaInput,
  maxBytes: number,
  signal?: AbortSignal,
) {
  if (Buffer.isBuffer(input)) return input
  if ("path" in input) return readFile(input.path, { signal })
  const res = await fetch(input.url, { headers: input.headers, signal })
  if (!res.ok) throw new Error(`${input.url} answered ${res.status}`)
  const length = Number(res.headers.get("content-length") ?? 0)
  if (length > maxBytes)
    throw new Error(`Media must contain 1–${maxBytes} bytes`)
  return Buffer.from(await res.arrayBuffer())
}

const isVideoURL = (input: MediaInput) =>
  !Buffer.isBuffer(input) &&
  /\.(mp4|m4v|mov|webm|mkv|ogv|ogg|m4a|mp3|wav)(\?|$)/i.test(
    "path" in input ? input.path : input.url,
  )

/** Prepare once. Upload returned files using the application's own store.
 * Originals are preserved; no credentials, publication, or database writes. */
export async function prepareMedia(
  input: MediaInput,
  options: PrepareOptions = {},
): Promise<PreparedMedia> {
  const {
    maxBytes = 32 * 1024 * 1024,
    maxPixels = 40_000_000,
    signal,
  } = options
  signal?.throwIfAborted()
  const boomerang = options.playback === "boomerang"
  const timed = isVideoURL(input) || options.audioOnly
  // Images (and a GIF to boomerang) are read whole; video and sound stream to ffmpeg.
  const data = timed ? null : await bytesOf(input, maxBytes, signal)
  if (data && (!data.length || data.length > maxBytes))
    throw new Error(`Media must contain 1–${maxBytes} bytes`)
  const meta = data
    ? await sharp(data, { limitInputPixels: maxPixels })
        .metadata()
        .catch(() => null)
    : null
  // Sharp identifies AVIF through its HEIF container and AV1 compression.
  const format =
    meta?.format === "heif" && meta.compression === "av1"
      ? "avif"
      : meta?.format
  if (meta && boomerang && (meta.pages ?? 1) <= 1)
    throw new Error("Boomerang requires an animated image or video")
  if (
    data &&
    meta &&
    !boomerang &&
    ["jpeg", "png", "webp", "gif", "avif"].includes(format ?? "")
  ) {
    const height = meta.pageHeight ?? meta.height
    if (!meta.width || !height || meta.width * height > maxPixels)
      throw new Error("Invalid image dimensions")
    const rotated = (meta.orientation ?? 0) >= 5
    const width = rotated ? height : meta.width
    const displayHeight = rotated ? meta.width : height
    const animated = (meta.pages ?? 1) > 1
    const ext = format === "jpeg" ? "jpg" : format
    const mime = `image/${format}`
    const p = await preview(data, maxPixels, options.posterFormat)
    const id = createHash("sha256")
      .update(data)
      .update(p.poster)
      .update(p.blurDataURL)
      .digest("hex")
      .slice(0, 24)
    signal?.throwIfAborted()
    return {
      asset: {
        kind: animated ? "animation" : "image",
        width,
        height: displayHeight,
        mime,
        bytes: data.length,
        blurDataURL: p.blurDataURL,
        average: p.average,
      },
      files: [
        {
          role: "source",
          name: `${id}-${width}x${displayHeight}.${ext}`,
          mime,
          data,
        },
        {
          role: "poster",
          name: `${id}.poster.${p.ext}`,
          mime: p.mime,
          data: p.poster,
        },
      ],
    }
  }
  if (!options.video && !options.audioOnly && !boomerang)
    throw new Error(
      "Unsupported image; video preparation must be explicitly enabled",
    )
  const dir = await mkdtemp(join(tmpdir(), "prepare-media-"))
  try {
    // What ffmpeg reads: the bytes written down, the path, or the URL. Its headers are
    // options OF that input, so they stand before the input they are for (`-i`).
    let target: string
    let reading: string[] = []
    if (data) {
      target = join(dir, "source")
      await writeFile(target, data)
    } else if (Buffer.isBuffer(input)) throw new Error("No media to read")
    else if ("path" in input) target = input.path
    else {
      target = input.url
      if (input.headers)
        reading = [
          "-headers",
          Object.entries(input.headers)
            .map(([k, v]) => `${k}: ${v}\r\n`)
            .join(""),
        ]
    }
    /** The input, as ffmpeg takes it: its options, then `-i` and it. */
    const from = [...reading, "-i", target]
    const run = (bin: string, args: string[]) =>
      exec(bin, args, { signal, timeout: 300_000, maxBuffer: 1024 * 1024 })
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      ...reading,
      target,
    ])
    const probe = JSON.parse(stdout)
    const stream = probe.streams?.find(
      (s: { codec_type: string }) => s.codec_type === "video",
    )
    const sound = probe.streams?.some(
      (s: { codec_type: string }) => s.codec_type === "audio",
    )
    const total = Number(probe.format?.duration)
    const span = options.span
    const length = span ? span.to - span.from : total
    if (
      (!stream && !options.audioOnly) ||
      (options.audioOnly && !sound) ||
      !Number.isFinite(length) ||
      length <= 0 ||
      length > MAX_SECONDS ||
      (span && (span.from < 0 || span.to > total + 0.5)) ||
      (stream && stream.width * stream.height > maxPixels)
    )
      throw new Error(
        `Expected ${options.audioOnly ? "sound" : "a video"} up to ${MAX_SECONDS / 60} minutes within the pixel limit${span ? ", the span inside it" : ""}`,
      )
    if (boomerang && (length < 0.1 || length > 10))
      throw new Error("Boomerang clips must be between 0.1 and 10 seconds")
    if (boomerang && options.audio === true)
      throw new Error(
        "Boomerang clips are silent; omit audio or set it to false",
      )
    // The span is a seek before the input: only its bytes are read.
    const seek = span ? ["-ss", String(span.from), "-t", String(length)] : []
    const side = options.maxSide ?? 1920
    const fit = `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))'`
    const posterPath = join(dir, "poster.png")

    if (options.audioOnly) {
      const output = join(dir, "sound.m4a")
      await run("ffmpeg", [
        "-v",
        "error",
        ...seek,
        ...from,
        "-vn",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        output,
      ])
      // Its picture, when it has one: the source a second in.
      const p = stream
        ? await (async () => {
            await run("ffmpeg", [
              "-v",
              "error",
              "-ss",
              String((span?.from ?? 0) + Math.min(1, length / 2)),
              ...from,
              "-frames:v",
              "1",
              "-vf",
              fit,
              posterPath,
            ])
            // ffmpeg can end well and write nothing when a remote source drops.
            const picture = await readFile(posterPath).catch(() => {
              throw new Error(
                `The source gave no picture at ${(span?.from ?? 0) + Math.min(1, length / 2)} s`,
              )
            })
            return preview(picture, maxPixels, options.posterFormat)
          })()
        : null
      const dims = p ? await sharp(p.poster).metadata() : null
      const bytes = await readFile(output)
      const rev = createHash("sha256").update(bytes).digest("hex").slice(0, 24)
      return {
        asset: {
          kind: "audio",
          width: dims?.width ?? 0,
          height: dims?.height ?? 0,
          mime: "audio/mp4",
          bytes: bytes.length,
          duration: length,
          ...(p && { blurDataURL: p.blurDataURL, average: p.average }),
        },
        files: [
          {
            role: "source",
            name: `${rev}.m4a`,
            mime: "audio/mp4",
            data: bytes,
          },
          ...(p
            ? [
                {
                  role: "poster" as const,
                  name: `${rev}.poster.${p.ext}`,
                  mime: p.mime,
                  data: p.poster,
                },
              ]
            : []),
        ],
      }
    }

    const output = join(dir, "video.mp4")
    // Reverse is prepared once, never emulated with browser seeks. Trim duplicate
    // turnaround frames so the loop does not pause at either endpoint.
    const filter = `scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30,split[f][r];[r]reverse,trim=start_frame=1:end=${length - 1 / 30},setpts=PTS-STARTPTS[b];[f][b]concat=n=2:v=1:a=0[v]`
    // Forward renditions preserve audio for native players; boomerangs are silent.
    await run("ffmpeg", [
      "-v",
      "error",
      ...seek,
      ...from,
      ...(boomerang
        ? ["-filter_complex", filter, "-map", "[v]"]
        : ["-map", "0:v:0", "-map", "0:a?", "-vf", fit]),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "23",
      ...(boomerang || options.audio === false ? ["-an"] : ["-c:a", "aac"]),
      "-movflags",
      "+faststart",
      output,
    ])
    await run("ffmpeg", [
      "-v",
      "error",
      "-ss",
      String(Math.max(0, Math.min(options.posterTime ?? 0, length / 2))),
      "-i",
      output,
      "-frames:v",
      "1",
      posterPath,
    ])
    const posterBytes = await readFile(posterPath)
    const dimensions = await sharp(posterBytes).metadata()
    if (!dimensions.width || !dimensions.height)
      throw new Error("Missing video dimensions")
    const p = await preview(posterBytes, maxPixels, options.posterFormat)
    const video = await readFile(output)
    const outputProbe = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      output,
    ])
    const outputDuration = Number(
      JSON.parse(outputProbe.stdout).format.duration,
    )
    const rev = createHash("sha256")
      .update(video)
      .update(p.poster)
      .update(p.blurDataURL)
      .digest("hex")
      .slice(0, 24)
    // Frames along the clip: frame i is the picture at i × every seconds.
    const frames: PreparedMedia["files"] = []
    if (options.frames) {
      const framesDir = join(dir, "frames")
      await mkdir(framesDir)
      await run("ffmpeg", [
        "-v",
        "error",
        "-i",
        output,
        "-vf",
        `fps=1/${options.frames.every},scale=${options.frames.width ?? 480}:-2`,
        "-q:v",
        "7",
        "-start_number",
        "0",
        join(framesDir, "%d.jpg"),
      ])
      const names = (await readdir(framesDir))
        .map((n) => Number.parseInt(n, 10))
        .sort((a, b) => a - b)
      for (const i of names)
        frames.push({
          role: "frame",
          name: `${rev}.frame-${i}.jpg`,
          mime: "image/jpeg",
          data: await readFile(join(framesDir, `${i}.jpg`)),
        })
    }
    return {
      asset: {
        kind: "video",
        width: dimensions.width,
        height: dimensions.height,
        mime: "video/mp4",
        bytes: video.length,
        duration: outputDuration,
        blurDataURL: p.blurDataURL,
        average: p.average,
        ...(options.frames &&
          frames.length > 0 && {
            frames: {
              every: options.frames.every,
              count: frames.length,
              name: `${rev}.frame-{i}.jpg`,
            },
          }),
      },
      files: [
        { role: "source", name: `${rev}.mp4`, mime: "video/mp4", data: video },
        {
          role: "poster",
          name: `${rev}.poster.${p.ext}`,
          mime: p.mime,
          data: p.poster,
        },
        ...frames,
      ],
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Resolve storage URLs after writing the prepared files. `url` maps a file's name to
 *  its address and leaves `{i}` in a frames name as it is. */
export function mediaAsset(
  prepared: PreparedMedia,
  url: (name: string) => string,
): MediaAsset {
  const source = prepared.files.find((f) => f.role === "source")
  if (!source) throw new Error("Prepared media has no source")
  const poster = prepared.files.find((f) => f.role === "poster")
  const { frames, ...asset } = prepared.asset
  return {
    ...asset,
    src: url(source.name),
    ...(poster ? { poster: url(poster.name) } : {}),
    ...(frames
      ? {
          frames: {
            every: frames.every,
            count: frames.count,
            src: url(frames.name),
          },
        }
      : {}),
  }
}
