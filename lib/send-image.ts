import "server-only"

import { Resvg } from "@resvg/resvg-js"
import { File as FileIcon, FileLock } from "lucide"
import { bytes } from "@/lib/bytes"
import {
  cut,
  esc,
  f,
  INK,
  icon,
  MONO,
  mark,
  measure,
  PAGE,
  photoOf,
  RESVG_FONT,
  SANS,
  SHARE_SIZE,
} from "@/lib/card-image"

// A SEND'S SHARE IMAGE: what a link preview of `eid.to/you/<name>` shows, a file and
// who sends it, never the person's card (that is their profile's). Drawn with the
// card's kit (lib/card-image): its fonts, its measure, its mark, its dark.
//
//   public   the file's name, its size, and who sends it
//   locked   that it is a file behind a password, and who sends it: the name is
//            said only to whoever says the password (the page's form, the CLI)
//
// A send for people has none: its address is their profile's to anyone else.

export type SendShown = {
  /** Its address, as people pass it: "/adrian/rhrxa9". */
  at: string
  from: { name: string; image: string | null }
  /** Null behind a password. */
  file: { name: string; size: number } | null
}

const { width: W, height: H } = SHARE_SIZE
const PAD = 96
const TEXT = W - 2 * PAD

export async function sendSvg({ at, from, file }: SendShown): Promise<string> {
  const photo = await photoOf(from.image)
  const title = file ? file.name : "a file, behind a password"
  const titleSize = 76
  const shown = (s: string) => measure(s, SANS, 500, titleSize) <= TEXT
  const line = shown(title) ? title : cut(title, shown)
  const sub = file
    ? bytes(file.size)
    : "its name and size, for whoever says the password"
  const byY = 470
  const face = 64
  const byX = PAD + (photo ? face + 24 : 0)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${PAGE}"/>
${icon(file ? FileIcon : FileLock, PAD, 112, 84, `stroke="${INK}" stroke-width="1.3"`, 0.75)}
<text x="${PAD}" y="${300}" font-family="${SANS}" font-weight="500" font-size="${titleSize}" fill="${INK}">${esc(line)}</text>
<text x="${PAD}" y="${360}" font-family="${MONO}" font-size="28" fill="${INK}" opacity="0.5">${esc(sub)}</text>
${
  photo
    ? `<defs><clipPath id="face"><circle cx="${f(PAD + face / 2)}" cy="${f(byY - face / 2 + 10)}" r="${face / 2}"/></clipPath></defs>
<image href="${photo}" x="${PAD}" y="${f(byY - face + 10)}" width="${face}" height="${face}" clip-path="url(#face)" preserveAspectRatio="xMidYMid slice"/>`
    : ""
}
<text x="${byX}" y="${byY - 8}" font-family="${SANS}" font-size="30" fill="${INK}" opacity="0.85">from ${esc(from.name)}</text>
<text x="${byX}" y="${byY + 28}" font-family="${MONO}" font-size="22" fill="${INK}" opacity="0.45">${esc(`eid.to${at}`)}</text>
${mark(W - PAD - 40, H - 72, 40, INK)}
</svg>`
}

/** The send's share image, as the PNG a link preview shows. */
export async function sendPng(shown: SendShown): Promise<Uint8Array> {
  return new Resvg(await sendSvg(shown), {
    font: RESVG_FONT,
    fitTo: { mode: "original" },
  })
    .render()
    .asPng()
}
