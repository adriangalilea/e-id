// The card format (lib/card-schema) proved on an example: a card shaped as
// lib/card builds it, parsed by the published schema, printed. A shape the schema
// refuses throws here. `bun scripts/examples/card-format.ts`
import { cardSchema, formatsOf } from "@/lib/card-schema"

const handle = "adrian"
const card = cardSchema.parse({
  $schema: "https://e-id.to/card.schema.json",
  version: 1,
  id: `https://e-id.to/${handle}`,
  address: `https://👤.to/${handle}`,
  handle,
  name: "Adrian Galilea Delgado",
  photo: "https://avatars.githubusercontent.com/u/90320947?v=4",
  country: "ES",
  bio: "Hello world",
  links: [
    {
      platform: "github",
      name: "GitHub",
      url: `https://github.com/${handle}`,
      route: `https://👤.to/${handle}/gh`,
      handle,
      profile: {
        name: "Adrian Galilea",
        handle,
        photo: "https://avatars.githubusercontent.com/u/90320947?v=4",
        count: { value: 52, unit: "followers" },
        verified: false,
      },
    },
    {
      platform: "website",
      name: "Website",
      url: "https://adriangalilea.com",
      route: `https://👤.to/${handle}/web`,
    },
    {
      platform: "youtube",
      name: "YouTube",
      url: "https://youtube.com/@Adrian_Galilea",
      route: `https://👤.to/${handle}/yt`,
      handle: "Adrian_Galilea",
      note: "Inactive for now.",
    },
    // A link of their own: ready in the format, not offered yet (lib/card-edit).
    { platform: "link", name: "book a call", url: "https://cal.com/adrian" },
  ],
  formats: formatsOf(handle),
  agent: null,
})

console.log(JSON.stringify(card.links, null, 2))
