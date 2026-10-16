"use client"

import { useState } from "react"
import { ShortLinkList } from "@/components/short-links"
import type { KeptShortLink } from "@/lib/card-edit"

// THE DEV PAGE'S LIVE SPECIMENS that need a hand on them: the short links list
// over made-up links, pressing one saying what the real list would open.

const NOW = Date.parse("2026-10-16T12:00:00Z")

const KEPT: KeptShortLink[] = [
  {
    id: "cv",
    slug: "cv",
    value: "https://example.com/cv.pdf",
    label: "my CV",
    expires: "",
    maxVisits: null,
    public: true,
    visits: 41,
    stopped: null,
  },
  {
    id: "talk",
    slug: "talk",
    value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "",
    expires: "2026-12-31",
    maxVisits: null,
    public: false,
    visits: 7,
    stopped: null,
  },
  {
    id: "file",
    slug: "k3v9qa",
    value: "https://example.com/notes.zip",
    label: "",
    expires: "",
    maxVisits: 1,
    public: false,
    visits: 1,
    stopped: null,
  },
  {
    id: "bad",
    slug: "login",
    value: "https://example.net/sign-in",
    label: "",
    expires: "",
    maxVisits: null,
    public: false,
    visits: 3,
    stopped: "SOCIAL_ENGINEERING",
  },
]

export function ShortLinksSpecimen({ username }: { username: string }) {
  const [opened, setOpened] = useState<string | null>(null)
  const link = KEPT.find((k) => k.id === opened)
  return (
    <div className="flex flex-col gap-2">
      <ShortLinkList
        username={username}
        kept={KEPT}
        now={NOW}
        onOpen={setOpened}
      />
      <p className="text-foreground/45 text-xs">
        {link
          ? `pressed: the real list opens /${username}/${link.slug} to be changed`
          : "press one: the real list opens it to be changed"}
      </p>
    </div>
  )
}
