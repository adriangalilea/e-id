import type { Role } from "@adriangalilea/utils/ansi"
import { indent, table } from "@adriangalilea/utils/cli"
import type { Card } from "@/lib/card-schema"

// A CARD AS A TERMINAL SHOWS IT, the one drawing of `eid card`: the CLI prints it
// (cli/src/eid.ts, painted with the cli's `ui` when it colours), and the home's
// terminal scene plays it (components/landing/features, painted always), each with
// its painter, so the page and the command can never disagree.

/** A string in a role: the CLI's `ui` when it colours, `inRole` on a page. */
export type Paint = (role: Role, s: string) => string

/** A link's address as a person writes it: no scheme, no `mailto:`. */
export const bare = (url: string) =>
  url.replace(/^(https?:\/\/|mailto:)/, "").replace(/\/$/, "")

/** Who, their line, every link with where it goes and its e-ID route (the person's
 *  part dimmed, the name that is the route's own lit), and the ways to get the
 *  rest. Read from card.json, the same data the page draws. */
export function cardLines(card: Card, paint: Paint): string {
  const home = `eid.to/${card.handle}`
  const rows = card.links.map((l) => [
    paint("head", l.name),
    bare(l.url),
    l.route
      ? `${paint("muted", `${home}/`)}${paint("accent", l.route.slice(l.route.lastIndexOf("/") + 1))}`
      : "",
  ])
  return [
    "",
    `  ${paint("head", card.name)}`,
    `  ${paint("accent", `@${card.handle}`)}${card.country ? paint("muted", ` · ${card.country}`) : ""}`,
    ...(card.bio ? ["", ...card.bio.split("\n").map((l) => `  ${l}`)] : []),
    ...(rows.length ? ["", indent(table(rows), 2)] : []),
    "",
    `  ${paint("muted", `${home} · as json: ${home}/json · as a contact: ${home}.vcf`)}`,
    "",
  ].join("\n")
}
