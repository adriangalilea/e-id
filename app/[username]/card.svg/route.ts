import { cacheLife } from "next/cache";
import { cardOf } from "@/lib/card";
import { cardSvg, compactSvg } from "@/lib/card-image";

// A person's card drawn, for the embed (`<e-id-card>`, app/embed.js) to set on any
// page: the share image's drawing of the card alone (lib/card-image), its photo
// inside it, so the page that shows it fetches nothing else from anywhere; with
// `?compact`, the same card as a byline (`<e-id-card compact>`). Open to every
// origin, as card.json is.

const CORS = { "access-control-allow-origin": "*" };

async function drawing(
  username: string,
  compact: boolean,
): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const card = await cardOf(username);
  if (!card) return null;
  return compact ? compactSvg(card) : cardSvg(card, "card");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const compact = new URL(request.url).searchParams.has("compact");
  const svg = await drawing(username, compact);
  if (!svg)
    return new Response(`no e-id is called ${username}`, {
      status: 404,
      headers: CORS,
    });
  return new Response(svg, {
    headers: { ...CORS, "content-type": "image/svg+xml; charset=utf-8" },
  });
}
