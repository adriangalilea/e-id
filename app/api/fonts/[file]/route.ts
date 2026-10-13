import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The card's fonts (assets/fonts, OFL), for the embed: a card on someone else's
// page sets its words in the faces it was measured in (lib/card-image). Fonts are
// fetched across origins only when the answer allows it, hence the header.

const FONTS = new Set([
  "SpaceGrotesk-Regular.ttf",
  "SpaceGrotesk-Medium.ttf",
  "SpaceMono-Regular.ttf",
]);

export function generateStaticParams() {
  return [...FONTS].map((file) => ({ file }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!FONTS.has(file)) return new Response("no such font", { status: 404 });
  const bytes = await readFile(join(process.cwd(), "assets/fonts", file));
  return new Response(bytes, {
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "font/ttf",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
