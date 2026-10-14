import { cardOf } from "@/lib/card";
import { getUsernames } from "@/lib/data";

// A person's card as data (lib/card), for anything that draws one off the site.
// Open to every origin: a card is public, and the embed reads it from other
// people's pages. Prerendered for every handle at build, as the profiles are; a
// handle that came later reads the same cached data.

export async function generateStaticParams() {
  return (await getUsernames()).map((username) => ({ username }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const card = await cardOf(username);
  if (!card)
    return Response.json(
      { error: `no e-ID is called ${username}` },
      { status: 404, headers: { "access-control-allow-origin": "*" } },
    );
  return Response.json(card, {
    headers: { "access-control-allow-origin": "*" },
  });
}
