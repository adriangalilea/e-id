import { z } from "zod"
import type { KeptShortLink } from "@/lib/card-edit"
import { linkPlatforms } from "@/lib/platforms"
import type { Allowance } from "@/lib/trust"

// EVERYTHING E-ID'S API SAYS AND HEARS, as schemas (app/api/v1): what each route
// validates its body with, what it answers, the error every route answers in,
// and the source of the API's OpenAPI file (app/api/v1/openapi.json), so the
// docs are the code. The CLI's `--json` prints these very shapes (cli/), its
// types inferred from here. Client-safe: no server module is imported, only
// types. The checks at the foot hold the server's own types and these schemas
// to one shape.

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("a day, 2026-12-31")

// ── what every route answers when it refuses ────────────────────────────────

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z
        .string()
        .describe(
          "what went wrong, for a program: unauthorized, slow_down, refused, not_found, bad_body, …",
        ),
      message: z.string().describe("what went wrong, for a person"),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "a refused write's reasons by field, as the site's forms show them",
        ),
    }),
  })
  .meta({ id: "Error" })
export type ApiError = z.infer<typeof ApiErrorSchema>["error"]

// ── signing in (the OAuth device flow, RFC 8628) ────────────────────────────

export const LoginStartBody = z
  .object({
    host: z
      .string()
      .regex(/^[\w.-]{1,64}$/)
      .describe("the machine's name"),
  })
  .meta({ id: "LoginStart" })

export const LoginStarted = z
  .object({
    device_code: z.string(),
    user_code: z
      .string()
      .describe("WXYZ-BCDF: shown in the terminal, approved at /cli"),
    verification_uri: z.string(),
    verification_uri_complete: z.string(),
    expires_in: z.number().describe("seconds"),
    interval: z.number().describe("seconds between questions"),
  })
  .meta({ id: "LoginStarted" })

export const LoginTokenBody = z
  .object({ device_code: z.string().min(20) })
  .meta({ id: "LoginToken" })

export const LoggedIn = z
  .object({
    key: z.string().describe("eid_…, shown this once"),
    username: z.string(),
  })
  .meta({ id: "LoggedIn" })

// ── who ─────────────────────────────────────────────────────────────────────

export const Me = z
  .object({
    username: z.string(),
    name: z.string().nullable(),
    addresses: z
      .record(z.string(), z.string())
      .describe("their page on each of e-ID's domains, by domain"),
  })
  .meta({ id: "Me" })

// ── short links and sends ───────────────────────────────────────────────────

export const ShortLinkOut = z
  .object({
    id: z.string(),
    slug: z.string().describe("its name: /you/<slug>"),
    kind: z
      .enum(["url", "send"])
      .describe("a redirect, or a file sent from its owner's machine"),
    value: z.string().describe("where a url goes; a send's sendme ticket"),
    label: z.string().describe("its name on the card; empty off it"),
    expires: z.string().describe("the last day it opens, or empty"),
    maxVisits: z
      .number()
      .nullable()
      .describe("how many times it opens, or no end"),
    public: z.boolean().describe("on the card"),
    visits: z.number().describe("how many times it opened"),
    stopped: z
      .string()
      .nullable()
      .describe("why it was taken down, or null while up"),
    file: z
      .object({ name: z.string(), size: z.number() })
      .nullable()
      .describe("a send's file"),
  })
  .meta({ id: "ShortLink" })

export const AllowanceOut = z
  .object({
    most: z.number().describe("links of their own the account may keep now"),
    why: z.string(),
    next: z
      .object({ most: z.number(), on: day })
      .nullable()
      .describe("when it grows, and to what"),
  })
  .meta({ id: "Allowance" })

export const Links = z
  .object({ links: z.array(ShortLinkOut), allowance: AllowanceOut })
  .meta({ id: "Links" })

export const LinkCreateBody = z
  .object({
    to: z.string().describe("where it goes"),
    name: z
      .string()
      .optional()
      .describe("its name, /you/<name>; none, a made-up code"),
    until: z
      .union([day, z.string().regex(/^\d{1,4}d$/)])
      .optional()
      .describe('the last day it opens: "2026-12-31", or "7d" from today'),
    opens: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("how many times it opens; 1 for one use"),
    onCard: z
      .boolean()
      .optional()
      .describe("on the card too (then `label` names it)"),
    label: z.string().optional(),
  })
  .meta({ id: "LinkCreate" })

export const SendCreateBody = z
  .object({
    ticket: z
      .string()
      .regex(/^blob[a-z0-9]{20,2000}$/)
      .describe("the sendme ticket"),
    file: z.object({
      name: z.string().min(1).max(255),
      size: z.number().int().min(0),
    }),
    name: z
      .string()
      .optional()
      .describe("its name, /you/<name>; none, a made-up code"),
  })
  .meta({ id: "SendCreate" })

export const SendOut = z
  .object({
    from: z.string().describe("whose it is"),
    slug: z.string(),
    ticket: z.string().describe("for sendme receive"),
    file: z.object({ name: z.string(), size: z.number() }),
  })
  .meta({ id: "Send" })

// ── numbers ─────────────────────────────────────────────────────────────────

export const Stats = z
  .object({
    views: z.number().describe("visits to their pages, all time"),
    hits: z.number().describe("links their addresses opened, all time"),
    detail: z
      .unknown()
      .optional()
      .describe("the last 30 days in full, for an admin"),
  })
  .meta({ id: "Stats" })

// ── the card ────────────────────────────────────────────────────────────────

/** The card as its owner edits it: every link on it, hidden ones too, read from
 *  the database as written (never the cached public card), what the card
 *  endpoints answer with. */
export const MyCard = z
  .object({
    name: z.string(),
    handle: z.string(),
    country: z.string(),
    bio: z.string(),
    vouches: z.boolean(),
    links: z.array(
      z.object({
        id: z.string().nullable(),
        platform: z.enum(linkPlatforms),
        value: z.string(),
        label: z.string(),
        note: z.string(),
        highlight: z.string(),
        public: z.boolean(),
        slug: z.string(),
        visits: z.number().optional(),
      }),
    ),
  })
  .meta({ id: "MyCard" })

export const CardPatchBody = z
  .object({
    name: z.string().optional(),
    bio: z.string().optional(),
    country: z
      .string()
      .length(2)
      .optional()
      .describe("ISO 3166 code, XX for none"),
    vouches: z.boolean().optional().describe("visitors may leave a vouch"),
  })
  .meta({ id: "CardPatch" })

/** The platforms a card can link, as the API names them in its path. */
export const CardPlatform = z.enum(
  linkPlatforms.filter((p) => p !== "link") as [
    Exclude<(typeof linkPlatforms)[number], "link">,
    ...Exclude<(typeof linkPlatforms)[number], "link">[],
  ],
)

export const CardLinkPutBody = z
  .object({
    value: z
      .string()
      .describe(
        "the handle on that platform, or the address for a website or an email",
      ),
    public: z.boolean().optional().describe("shown on the card; default true"),
    note: z.string().optional(),
  })
  .meta({ id: "CardLinkPut" })

// ── one shape, both ways ────────────────────────────────────────────────────

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const same = <T extends true>(_: T) => {}
same<Same<z.infer<typeof ShortLinkOut>, KeptShortLink>>(true)
same<Same<z.infer<typeof AllowanceOut>, Allowance>>(true)
