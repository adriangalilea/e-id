"use client"

import { Pin, PinOff } from "lucide-react"
import { Tip } from "@/components/ui/tooltip"
import { pinCommentToggle } from "@/db/actions"
import type { SelectComment } from "@/db/schema"
import { Button } from "./ui/button"

export default function PinComment({
  commentId,
  pinned,
  onChange,
}: {
  commentId: SelectComment["id"]
  pinned: boolean
  onChange: () => void
}) {
  return (
    <form
      action={async () => {
        await pinCommentToggle(commentId)
        onChange()
      }}
    >
      <Tip content={pinned ? "unpin" : "pin"} side="left">
        <Button variant="outline" size="icon-lg">
          {pinned ? <PinOff strokeWidth={1} /> : <Pin strokeWidth={1} />}
        </Button>
      </Tip>
    </form>
  )
}
