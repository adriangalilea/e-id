import { cardOf } from "@/lib/card"
import { cardText } from "@/lib/card-text"
import { getUsernames } from "@/lib/data"

// A person's card as text (lib/card-text), for a terminal: `curl https://eid.to/you`
// lands here (next.config), as does `/you/txt`. Prerendered for every handle, as
// card.json is.

export async function generateStaticParams() {
  return (await getUsernames()).map((username) => ({ username }))
}

const TEXT = { "content-type": "text/plain; charset=utf-8" }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const card = await cardOf(username)
  if (!card)
    return new Response(`no e-ID is called ${username}\n`, {
      status: 404,
      headers: TEXT,
    })
  return new Response(cardText(card), { headers: TEXT })
}
