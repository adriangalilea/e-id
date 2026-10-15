import { hasFlag } from "country-flag-icons"
import { z } from "zod"
import { HIGHLIGHTED, linkPlatforms, OFFERED } from "@/lib/platforms"
import { usernameProblem } from "@/lib/username-rules"

// A profile's card as its owner edits it in place (components/card-editor),
// one schema for both sides: the browser checks the card against it as it is
// written, the server parses what it is sent with it before writing a thing
// (db/actions, `saveCard`). No React, no database. The browser loads it with
// the editor, only when an owner opens their card.

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
  })
  .refine((l) => OFFERED.includes(l.platform), {
    message: "Links of your own are not open yet.",
    path: ["platform"],
  })
  .refine((l) => l.platform !== "link" || l.label !== "", {
    message: "Name the link.",
    path: ["label"],
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
   *  platform's route has one destination), any number of `link`s. */
  links: z
    .array(editLinkSchema)
    .max(32)
    .refine((links) => {
      const known = links
        .filter((l) => l.platform !== "link")
        .map((l) => l.platform)
      return new Set(known).size === known.length
    }, "One link per platform."),
})

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

/** The card checked as it is written: its errors, none when it can be saved. */
export function checkCard(edit: CardEdit): CardErrors {
  const parsed = cardEditSchema.safeParse(edit)
  return parsed.success ? {} : errorsOf(parsed.error)
}

/** The errors of one link on the card, by its field. */
export function linkErrors(errors: CardErrors, index: number) {
  const at = (field: keyof EditLink) => errors[`links.${index}.${field}`]
  return {
    value: at("value"),
    label: at("label"),
    note: at("note"),
    highlight: at("highlight"),
  }
}

/** What saving a card comes back with: the username it is at now, or what is
 *  wrong, nothing written. */
export type SaveResult =
  | { ok: true; username: string }
  | { ok: false; errors: CardErrors }
