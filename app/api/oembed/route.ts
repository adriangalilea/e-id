import { cardOf } from "@/lib/card";
import { SHARE_SIZE } from "@/lib/card-image";
import {
  EMOJI_DOMAIN,
  EMOJI_DOMAIN_PUNYCODE,
  MAIN_DOMAIN,
  PROD_URL,
  SHORT_DOMAIN,
} from "@/lib/const";

// oEmbed (oembed.com): a profile's address, pasted where a site reads oEmbed (a
// CMS, a chat, a notes app), becomes the card itself, the `<e-id-card>` embed, with
// the share image as its thumbnail. Profiles name this endpoint in their head
// (app/[username]/page.tsx), so a reader finds it from the page alone.

/** Every host a profile's address may be written with. */
const HOSTS = new Set([
  MAIN_DOMAIN,
  SHORT_DOMAIN,
  EMOJI_DOMAIN,
  EMOJI_DOMAIN_PUNYCODE,
]);

/** The card's width when the consumer asks no maximum: as the embed's own default. */
const WIDTH = 448;

const ID1 = 53.98 / 85.6;

function handleOf(address: string): string | null {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length === 1 ? decodeURIComponent(parts[0] as string) : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "json";
  if (format !== "json")
    return new Response("only format=json is served", { status: 501 });
  const address = params.get("url");
  const handle = address && handleOf(address);
  if (!handle)
    return new Response(`not an e-id profile address: ${address}`, {
      status: 404,
    });
  const card = await cardOf(handle);
  if (!card)
    return new Response(`no e-id is called ${handle}`, { status: 404 });

  const asked = Number(params.get("maxwidth"));
  const width = Math.round(asked > 0 ? Math.min(asked, WIDTH) : WIDTH);
  const height = Math.round(width * ID1);
  const name = card.name.replace(/[<>&"]/g, "");
  const html =
    `<script type="module" src="${PROD_URL}/embed.js"></script>` +
    `<e-id-card handle="${card.handle}" style="--e-id-card-width:${width}px">` +
    `<a href="${card.id}">${name} on e-id</a></e-id-card>`;

  return Response.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: "e-id",
      provider_url: PROD_URL,
      title: `${name} (@${card.handle})`,
      author_name: name,
      author_url: card.id,
      html,
      width,
      height,
      thumbnail_url: `${card.id}/opengraph-image`,
      thumbnail_width: SHARE_SIZE.width,
      thumbnail_height: SHARE_SIZE.height,
      cache_age: 86400,
    },
    { headers: { "access-control-allow-origin": "*" } },
  );
}
