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
    kind: "url",
    file: null,
    to: null,
    locked: false,
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
    kind: "url",
    file: null,
    to: null,
    locked: false,
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
    kind: "url",
    file: null,
    to: null,
    locked: false,
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
    kind: "url",
    file: null,
    to: null,
    locked: false,
  },
  {
    id: "send",
    slug: "notes",
    value: "blobexampleticket",
    label: "",
    expires: "",
    maxVisits: null,
    public: false,
    visits: 2,
    stopped: null,
    kind: "send",
    file: { name: "notes.zip", size: 2_400_000 },
    to: null,
    locked: false,
  },
  {
    id: "send-to",
    slug: "draft",
    value: "blobexampleticket",
    label: "",
    expires: "",
    maxVisits: null,
    public: false,
    visits: 1,
    stopped: null,
    kind: "send",
    file: { name: "draft.pdf", size: 180_000 },
    to: [
      { username: "ada", taken: "2026-10-16T18:02:00.000Z", declined: null },
      { username: "bob", taken: null, declined: "2026-10-16T18:05:00.000Z" },
      { username: "cy", taken: null, declined: null },
    ],
    locked: false,
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
