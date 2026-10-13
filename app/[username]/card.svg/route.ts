import { cacheLife } from "next/cache";
import { cardOf } from "@/lib/card";
import { cardSvg } from "@/lib/card-image";

// A person's card drawn, for the embed (`<e-id-card>`, app/embed.js) to set on any
// page: the share image's drawing of the card alone (lib/card-image), its photo
// inside it, so the page that shows it fetches nothing else from anywhere. Open to
// every origin, as card.json is.

const CORS = { "access-control-allow-origin": "*" };

async function drawing(username: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const card = await cardOf(username);
  return card ? cardSvg(card, "card") : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const svg = await drawing(username);
  if (!svg)
    return new Response(`no e-id is called ${username}`, {
      status: 404,
      headers: CORS,
    });
  return new Response(svg, {
    headers: { ...CORS, "content-type": "image/svg+xml; charset=utf-8" },
  });
}
