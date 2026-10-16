import { notFound } from "next/navigation"
import { cardOf } from "@/lib/card"
import { cardPng, SHARE_SIZE } from "@/lib/card-image"
import { sendPng } from "@/lib/send-image"
import { sendShownAt } from "@/lib/sends"

// What a link preview of `eid.to/you/<name>` shows: a send's file card (lib/send-image:
// the file and who sends it, or only that it is behind a password), else the
// person's card, as their profile's. Drawn when asked, never kept: a send lives only
// while its sender serves it.

export const size = SHARE_SIZE
export const contentType = "image/png"
export const alt = "what this e-ID link is"

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; link: string }>
}) {
  const { username, link } = await params
  const send = await sendShownAt(username, link)
  if (send)
    return new Response((await sendPng(send)) as BodyInit, {
      headers: { "content-type": contentType },
    })
  const card = await cardOf(username)
  if (!card) notFound()
  return new Response((await cardPng(card)) as BodyInit, {
    headers: { "content-type": contentType },
  })
}
