import { cacheLife } from "next/cache"
import { cardOf } from "@/lib/card"
import { cardSvg, drawingAnswer } from "@/lib/card-image"
import { getUsernames } from "@/lib/data"
import { renamedAnswer } from "@/lib/renamed"

// A person's card drawn, for the embed (`<e-id-card>`, app/embed.js) to set on any
// page: the share image's drawing of the card alone (lib/card-image), its photo
// inside it, so the page that shows it fetches nothing else from anywhere.
// Prerendered for every handle at build and kept until the profile changes (the
// card's reads carry its tags), so a page view on someone's site runs nothing; a
// handle that came later is drawn once, then kept.

export async function generateStaticParams() {
  return (await getUsernames()).map((username) => ({ username }))
}

async function drawing(username: string): Promise<string | null> {
  "use cache"
  cacheLife("max")
  const card = await cardOf(username)
  return card ? cardSvg(card, "card") : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const svg = await drawing(username)
  return (
    (svg ? null : await renamedAnswer(request, username, "/card.svg")) ??
    drawingAnswer(svg, username)
  )
}
