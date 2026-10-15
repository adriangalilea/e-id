import { cardJsonSchema } from "@/lib/card-schema"

// The open card format as JSON Schema (lib/card-schema), what every card names
// in its `$schema`: generated from the schema the site builds cards with, so it
// is always the format as published. Static, open to every origin.

export function GET() {
  return Response.json(cardJsonSchema(), {
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/schema+json",
    },
  })
}
