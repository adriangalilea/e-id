import { PROD_URL } from "@/lib/const"

/** The HTML that puts `handle`'s card on any page (app/embed.js): the one
 *  snippet the share menu, the home, the card format and oEmbed all give.
 *  `compact` is the card as a byline, for the foot of a post. */
export function embedOf(
  handle: string,
  face: "card" | "compact" = "card",
): string {
  const compact = face === "compact" ? " compact" : ""
  return `<script type="module" src="${PROD_URL}/embed.js"></script>\n<e-id-card handle="${handle}"${compact}></e-id-card>`
}
