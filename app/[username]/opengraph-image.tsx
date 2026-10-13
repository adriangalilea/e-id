import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { cardOf } from "@/lib/card";
import { cardPng, SHARE_SIZE } from "@/lib/card-image";
import { EMOJI_DOMAIN } from "@/lib/const";

// A profile's share image: their card (lib/card-image). Drawn once per card and
// kept until the profile changes: the card's reads carry the profile's tags, so a
// write that expires the page expires this too.

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = `An e-id card on ${EMOJI_DOMAIN}`;

async function shareImage(username: string): Promise<Uint8Array | null> {
  "use cache";
  cacheLife("max");
  const card = await cardOf(username);
  return card ? cardPng(card) : null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const png = await shareImage(username);
  if (!png) notFound();
  return new Response(png as BodyInit, {
    headers: { "content-type": contentType },
  });
}
