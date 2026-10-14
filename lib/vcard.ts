import "server-only";

import type { Card } from "@/lib/card-schema";
import { fetchPhoto } from "@/lib/photo";

// A PERSON'S CARD AS A CONTACT: the same card (lib/card) in vCard, so a phone adds
// them to its contacts in one tap, photo and all. vCard 3.0 (RFC 2426), not 4.0:
// it is the version every contacts app reads whole (iOS reads 3.0's embedded
// photo and its labelled links; 4.0's photo by URL it does not fetch). Served at
// /<username>/card.vcf, reached as /<username>.vcf and by asking a profile for
// `text/vcard` (next.config, `rewrites`).

/** The media type a profile names its contact by, in its `<link rel="alternate">`. */
export const VCARD_TYPE = "text/vcard";

/** A value as a vCard text: its backslashes, commas, semicolons and line breaks
 *  escaped (RFC 2426 §4). */
const text = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;")
    .replace(/\r?\n/g, "\\n");

/** A content line folded at 75 octets, each fold a CRLF and a space (RFC 2425
 *  §5.8.1), never inside a character: a name in any script survives. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first line holds 75 octets; each folded one 74 after its space.
    if (octets + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(part);
      part = "";
      octets = 0;
    }
    part += char;
    octets += size;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

/** The country's name in English, the code's own name (ISO 3166-1). */
const countryName = (code: string) =>
  new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;

/** `card` as a vCard: name, handle, photo, their e-id, every link labelled by
 *  its name, their country and bio. */
export async function vcardOf(card: Card): Promise<string> {
  const photo = await fetchPhoto(card.photo, "contact");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//e-id//e-id.to//EN",
    `UID:${card.id}`,
    `FN:${text(card.name)}`,
    // The name as one given name: no reader can tell a family name from a given
    // one in every culture, and a guess files people under the wrong letter.
    `N:;${text(card.name)};;;`,
    `NICKNAME:${text(card.handle)}`,
    ...(photo
      ? [
          `PHOTO;ENCODING=b;TYPE=${photo.mime.split("/")[1]?.toUpperCase()}:${Buffer.from(photo.bytes).toString("base64")}`,
        ]
      : []),
    // Their e-id first, then each link, each labelled by its name (Apple's
    // grouped label, which other readers ignore and keep the URL).
    "item1.URL:" + card.id,
    "item1.X-ABLabel:e-ID",
    // An email link is their address, as a contact's email; every other link a
    // URL.
    ...card.links.flatMap((link, i) =>
      link.url.startsWith("mailto:")
        ? [`EMAIL;TYPE=INTERNET:${text(link.url.slice("mailto:".length))}`]
        : [
            `item${i + 2}.URL:${link.url}`,
            `item${i + 2}.X-ABLabel:${text(link.name)}`,
          ],
    ),
    ...(card.country ? [`ADR;TYPE=HOME:;;;;;;${text(countryName(card.country))}`] : []),
    ...(card.bio ? [`NOTE:${text(card.bio)}`] : []),
    `SOURCE:${card.id}.vcf`,
    "END:VCARD",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
