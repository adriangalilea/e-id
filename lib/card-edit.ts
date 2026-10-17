import { hasFlag } from "country-flag-icons"
import { z } from "zod"
import { LINK_SLUG, refusedLinkName } from "@/lib/link-names"
import { HIGHLIGHTED, linkPlatforms, OFFERED } from "@/lib/platforms"
import { usernameProblem } from "@/lib/username-rules"

// A profile's card as its owner edits it in place (components/card-editor), and
// their short links as they keep them (components/short-links): one schema each
// for both sides, the browser checking as it is written, the server parsing what
// it is sent before writing a thing (db/actions, `saveCard`, `saveShortLink`).
// No React, no database.
//
// TWO THINGS, ONE TABLE: a card shows where you are (your platforms, and a few
// links of your own you name for it), edited on the card; a short link is a link
// of your own you hand out, `/you/<name>`, as many as you like, never on the
// card unless you put it there, kept in its own list. A link of your own on the
// card is a short link too.

/** The most links a card shows: about two rows of its marks. */
export const MOST_ON_CARD = 12

/** The most links of their own one person keeps, short links and the card's
 *  together, once their account has earned it (lib/trust). */
export const MOST_SHORT_LINKS = 200

/** What a short link must be, wherever it is written: where it sends people (a
 *  page on the web, never a script or a bare word), a name its owner can have,
 *  and, if it stops opening, never on the card (the card is cached and could not
 *  know the moment it stops). */
/** What is wrong with a name for a link of one's own (`/you/<name>`), a short
 *  link's or a send's, or null for nothing. */
export function slugProblem(slug: string): string | null {
  const name = slug.toLowerCase()
  return !LINK_SLUG.test(name)
    ? "Letters, digits and single hyphens, at most 40."
    : refusedLinkName(name)
}

function shortLinkIssues(
  l: {
    value: string
    slug: string
    expires?: string
    maxVisits?: number | null
    public: boolean
  },
  ctx: z.RefinementCtx,
) {
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(l.value.trim()))
    ctx.addIssue({
      code: "custom",
      message: "A whole address: https://…",
      path: ["value"],
    })
  const why = slugProblem(l.slug)
  if (why) ctx.addIssue({ code: "custom", message: why, path: ["slug"] })
  if ((l.expires || (l.maxVisits ?? null) !== null) && l.public)
    ctx.addIssue({
      code: "custom",
      message: "One that stops opening is never on your card.",
      path: ["public"],
    })
}

const EXPIRES = z
  .string()
  .refine((d) => d === "" || /^\d{4}-\d{2}-\d{2}$/.test(d), "A day.")

const MAX_VISITS = z
  .number()
  .int("A whole number.")
  .min(1, "At least one.")
  .max(1_000_000)
  .nullable()

export const editLinkSchema = z
  .object({
    /** The stored link, null for one added while editing. */
    id: z.string().min(1).nullable(),
    platform: z.enum(linkPlatforms),
    /** The username, the address or the URL there. */
    value: z
      .string()
      .trim()
      .min(1, "Say where: the username or the address.")
      .max(512),
    /** Their own name for it, a `link`'s only name; "" for none. */
    label: z.string().trim().max(60, "A name is at most 60 characters."),
    /** What they say of it, shown over it on the profile; "" for nothing. */
    note: z.string().trim().max(500, "A note is at most 500 characters."),
    /** A video or post to show first (`HIGHLIGHTED`), its id; "" for none. */
    highlight: z.string().trim().max(64),
    /** On the card, the profile and every form of the card (its data, its
     *  contact); off, stored and kept for the owner alone. */
    public: z.boolean(),
    /** A `link`'s address name, `/you/<slug>`; "" on a platform's. When it
     *  stops opening is the short links' list's: one that stops is never on
     *  the card, so a card's link never does. */
    slug: z.string().trim(),
    /** How many times it has been opened: shown, never written. */
    visits: z.number().int(),
  })
  .refine((l) => OFFERED.includes(l.platform), {
    message: "Not a platform e-ID offers.",
    path: ["platform"],
  })
  .refine((l) => l.platform !== "link" || l.label !== "", {
    message: "Name the link.",
    path: ["label"],
  })
  .superRefine((l, ctx) => {
    if (l.platform !== "link") {
      if (l.slug)
        ctx.addIssue({
          code: "custom",
          message: "Only a link of your own has an address.",
          path: ["slug"],
        })
      return
    }
    shortLinkIssues(l, ctx)
  })
  .refine((l) => l.highlight === "" || HIGHLIGHTED.includes(l.platform), {
    message: "Only a video or a post can be highlighted.",
    path: ["highlight"],
  })

export const cardEditSchema = z.object({
  name: z.string().trim().max(100, "A name is at most 100 characters."),
  handle: z
    .string()
    .trim()
    .superRefine((username, ctx) => {
      const why = usernameProblem(username)
      if (why) ctx.addIssue({ code: "custom", message: why })
    }),
  /** ISO 3166 alpha-2 with a flag, "XX" for none. */
  country: z
    .string()
    .refine((code) => code === "XX" || hasFlag(code), "No such country."),
  bio: z.string().trim().max(500, "A bio is at most 500 characters."),
  /** Whether people can leave a vouch on their page. */
  vouches: z.boolean(),
  /** In the card's order: one per known platform (the editor's rule, so a
   *  platform's route has one destination), and the links of your own on the
   *  card; those off it are short links only, kept in their own list. */
  links: z
    .array(editLinkSchema)
    .max(32)
    .refine(
      (links) => links.filter((l) => l.public).length <= MOST_ON_CARD,
      `A card shows at most ${MOST_ON_CARD} links: hide one, or keep it as a short link.`,
    )
    .refine((links) => {
      const known = links
        .filter((l) => l.platform !== "link")
        .map((l) => l.platform)
      return new Set(known).size === known.length
    }, "One link per platform.")
    .superRefine((links, ctx) => {
      const seen = new Set<string>()
      links.forEach((l, i) => {
        if (l.platform !== "link") return
        const slug = l.slug.toLowerCase()
        if (seen.has(slug))
          ctx.addIssue({
            code: "custom",
            message: `You have another link at /${slug}.`,
            path: [i, "slug"],
          })
        seen.add(slug)
      })
    }),
})

/** One short link as its owner writes it (components/short-links): where it goes, its
 *  name under theirs, when it stops, and whether it is also on the card, named
 *  (`label`) there. */
export const shortLinkSchema = z
  .object({
    /** The stored link, null for a new one. */
    id: z.string().min(1).nullable(),
    value: z.string().trim().min(1, "Say where it goes.").max(2048),
    slug: z.string().trim(),
    /** Its name on the card; "" for one only handed out. */
    label: z.string().trim().max(60, "A name is at most 60 characters."),
    expires: EXPIRES,
    maxVisits: MAX_VISITS,
    public: z.boolean(),
  })
  .superRefine(shortLinkIssues)
  .refine((a) => !a.public || a.label !== "", {
    message: "Name it for your card.",
    path: ["label"],
  })

export type ShortLink = z.input<typeof shortLinkSchema>

/** One of a send's people, as the outbox shows them: when they took it, or when
 *  they said no to it (ISO), both null while it waits. */
export type Recipient = {
  username: string
  taken: string | null
  declined: string | null
}

/** A short link as kept: its opens, and why it was taken down (a Safe Browsing
 *  threat, or "admin"; lib/threats), null while it is up. */
export type KeptShortLink = ShortLink & {
  id: string
  visits: number
  stopped: string | null
  /** A redirect (`url`), or a file served from its owner's machine (`send`,
   *  lib/sends), its value the sendme ticket and `file` what it is. */
  kind: "url" | "send"
  file: { name: string; size: number } | null
  /** A send's people and what each did with it; null for anyone with the address. */
  to: Recipient[] | null
  /** A send behind a password. */
  locked: boolean
}

/** The card as it is being written (untrimmed). */
export type CardEdit = z.input<typeof cardEditSchema>
export type EditLink = z.input<typeof editLinkSchema>

/** What is wrong with a card, each message under its field's path ("handle",
 *  "links.2.value"), the first one each. */
export type CardErrors = Record<string, string>

export function errorsOf(error: z.ZodError): CardErrors {
  const errors: CardErrors = {}
  for (const issue of error.issues)
    errors[issue.path.join(".")] ??= issue.message
  return errors
}

/** What saving a card comes back with: the username it is at now, or what is
 *  wrong, nothing written. */
export type SaveResult =
  | { ok: true; username: string }
  | { ok: false; errors: CardErrors }
