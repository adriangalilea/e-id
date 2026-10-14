import { z } from "zod";
import { type LinkPlatform, linkPlatforms } from "@/db/schema";
import { PROD_URL } from "@/lib/const";

// THE OPEN CARD FORMAT, defined once: an e-ID card as data anyone can read. The
// type the site builds it with (lib/card, `cardOf`) and the JSON Schema it is
// published by (/card.schema.json) are both this schema, so the two cannot
// differ. A field is added, never renamed or removed; `version` moves only when a
// reader would read it wrongly. No server, no React: a page may show it too.

/** Where the format's JSON Schema is published, and what each card names in its
 *  `$schema`, so an editor or a validator finds it from a card alone. */
export const CARD_SCHEMA_URL = `${PROD_URL}/card.schema.json`;

/** The media type a profile names its card by, in its `<link rel="alternate">`. */
export const CARD_TYPE = "application/vnd.e-id.card+json";

export const cardSchema = z
  .object({
    $schema: z.literal(CARD_SCHEMA_URL),
    version: z.literal(1),
    id: z.url().describe("The profile's canonical address: what the card is about."),
    address: z.url().describe("The address people share, on the emoji domain."),
    handle: z.string().describe("The username, as the address ends."),
    name: z.string().describe("The name they go by; the handle when they set none."),
    photo: z.url().nullable().describe("An image of them, or null."),
    country: z
      .string()
      .regex(/^[A-Z]{2}(-[A-Z0-9]+)?$/)
      .nullable()
      .describe("ISO 3166-1 alpha-2 (or a subdivision with a flag), or null when unset."),
    bio: z.string().nullable().describe("What they say of themselves, or null."),
    links: z
      .array(
        z.object({
          platform: z
            .string()
            .describe(
              `Where it goes: a platform e-ID knows (${linkPlatforms.filter((p) => p !== "link").map((p) => `"${p}"`).join(", ")}, and more as e-ID learns them), or "link", anywhere at all. A reader that does not know a platform shows the link by its name and url.`,
            ),
          name: z
            .string()
            .describe('What it is called: the platform\'s name ("GitHub"), or the person\'s own words ("book a call").'),
          url: z.string().describe("Where it opens: a URL, or mailto: for an email."),
          route: z
            .url()
            .optional()
            .describe(
              "The e-ID address that sends people there (https://👤.to/<handle>/gh): on the first link of each platform; absent on a \"link\", which has none.",
            ),
          handle: z
            .string()
            .optional()
            .describe("Their username there; absent where the link is an address (a website, an email, a link)."),
          note: z.string().optional().describe("What they say of it; absent when nothing."),
          profile: z
            .object({
              name: z.string().describe("The name they go by there."),
              handle: z.string().describe("Their username there, without the @."),
              photo: z.url().nullable().describe("Their picture there, or null."),
              count: z
                .object({
                  value: z.int().nonnegative(),
                  unit: z.string().describe('Plural, lowercase: "followers", "subscribers".'),
                })
                .nullable()
                .describe("What the platform counts that matters most, or null."),
              verified: z.boolean().describe("Whether the platform marks them verified."),
            })
            .optional()
            .describe(
              "Who they are there, read from the platform (GitHub, YouTube, Telegram), kept a day; absent where the platform is not read or the read failed.",
            ),
        }),
      )
      .describe("Where they are online, in their order (the order their card draws them in): an array, so the order is the data's own."),
    formats: z
      .object({
        json: z.url().describe("This card as data."),
        vcard: z.url().describe("This card as a contact (vCard), to save on a phone."),
        image: z.url().describe("This card drawn (SVG), as the share image and the embed draw it."),
        embed: z
          .string()
          .describe("The HTML that puts this card on any page: a script and its element."),
      })
      .describe("Where this card is in every other form, so a reader finds each from the card alone."),
    agent: z
      .object({ mcp: z.url().describe("Their MCP server.") })
      .nullable()
      .describe(
        "Their own agent, for a visitor's assistant to talk to: e-ID points to it and runs none. Reserved; null until a person sets one.",
      ),
  })
  .meta({
    id: "e-id-card",
    title: "e-ID card",
    description: "A person's e-ID card as data: who they are and where they are online.",
  });

/** A person's card. */
export type Card = z.infer<typeof cardSchema>;

/** The HTML that puts `handle`'s card on any page (app/embed.js): the one
 *  snippet the share menu, the home and oEmbed all give. */
export function embedOf(handle: string): string {
  return `<script type="module" src="${PROD_URL}/embed.js"></script>\n<e-id-card handle="${handle}"></e-id-card>`;
}

/** Where `handle`'s card is in every form (`formats`). */
export function formatsOf(handle: string): Card["formats"] {
  return {
    json: `${PROD_URL}/${handle}/json`,
    vcard: `${PROD_URL}/${handle}.vcf`,
    image: `${PROD_URL}/${handle}/card.svg`,
    embed: embedOf(handle),
  };
}

/** A platform this site knows, from a card it wrote: one it does not know is a
 *  card from somewhere else, or a platform added here and not yet drawn. */
export function knownPlatform(platform: string): LinkPlatform {
  if (!(linkPlatforms as readonly string[]).includes(platform))
    throw new Error(`a card link on "${platform}", a platform e-ID does not know`);
  return platform as LinkPlatform;
}

/** The format as JSON Schema (2020-12), as published. */
export function cardJsonSchema() {
  return {
    ...z.toJSONSchema(cardSchema, { target: "draft-2020-12" }),
    $id: CARD_SCHEMA_URL,
  };
}
