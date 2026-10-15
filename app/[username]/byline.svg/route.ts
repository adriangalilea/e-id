import { cacheLife } from "next/cache"
import { cardOf } from "@/lib/card"
import { compactSvg, drawingAnswer } from "@/lib/card-image"
import { getUsernames } from "@/lib/data"
import { renamedAnswer } from "@/lib/renamed"

// A person's card as a byline, drawn (lib/card-image `compactSvg`), for the embed's
// compact face (`<e-id-card compact>`, app/embed.js) at the foot of a post.
// Prerendered and kept as the full card is (card.svg).

export async function generateStaticParams() {
  return (await getUsernames()).map((username) => ({ username }))
}

async function drawing(username: string): Promise<string | null> {
  "use cache"
  cacheLife("max")
  const card = await cardOf(username)
  return card ? compactSvg(card) : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const svg = await drawing(username)
  return (
    (svg ? null : await renamedAnswer(request, username, "/byline.svg")) ??
    drawingAnswer(svg, username)
  )
}
