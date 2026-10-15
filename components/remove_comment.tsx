"use client"

import ConfirmRemove from "@/components/confirm-remove"
import { deleteComment } from "@/db/actions"
import type { SelectComment } from "@/db/schema"

export default function RemoveComment({
  commentId,
  onChange,
}: {
  commentId: SelectComment["id"]
  onChange: () => void
}) {
  return (
    <ConfirmRemove
      side="left"
      onRemove={async () => {
        await deleteComment(commentId)
        onChange()
      }}
    />
  )
}
