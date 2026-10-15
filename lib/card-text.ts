import type { Card } from "@/lib/card-schema"
import { SHORT_DOMAIN } from "@/lib/const"

// THE CARD IN A TERMINAL: `curl https://eid.to/you` (next.config sends a
// command-line client here) prints the card as text, from the same data the
// page, the image and card.json draw (lib/card). Plain ASCII where it lines up
// (a terminal does not agree on an emoji's width), addresses on the short domain
// (typeable, and no emoji to paste), and the ways to get the rest.

/** A link's address as a person writes it: no scheme, no `mailto:`. */
const bare = (url: string) =>
  url.replace(/^(https?:\/\/|mailto:)/, "").replace(/\/$/, "")

/** Where an e-ID route sends people, on the short domain: `eid.to/you/gh`. */
const short = (route: string, handle: string) =>
  `${SHORT_DOMAIN}/${handle}/${route.slice(route.lastIndexOf("/") + 1)}`

export function cardText(card: Card): string {
  const names = Math.max(...card.links.map((l) => l.name.length), 0)
  const urls = Math.max(...card.links.map((l) => bare(l.url).length), 0)
  const links = card.links.map((l) =>
    `  ${l.name.padEnd(names)}  ${bare(l.url).padEnd(urls)}  ${l.route ? short(l.route, card.handle) : ""}`.trimEnd(),
  )
  const home = `${SHORT_DOMAIN}/${card.handle}`
  return [
    "",
    `  ${card.name}`,
    `  @${card.handle}${card.country ? ` · ${card.country}` : ""}`,
    ...(card.bio ? ["", ...card.bio.split("\n").map((l) => `  ${l}`)] : []),
    ...(links.length ? ["", ...links] : []),
    "",
    `  ${home} · as json: ${home}/json · as a contact: ${home}.vcf`,
    "",
  ].join("\n")
}
