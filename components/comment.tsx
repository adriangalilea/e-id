"use client"

import type { ThreadComment } from "@/db/actions"
import PinComment from "./pin_comment"
import { Testimonial } from "./quote"
import RemoveComment from "./remove_comment"

export default function Comment({
  comment,
  canPin,
  onChange,
}: {
  comment: ThreadComment
  canPin: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start gap-2">
      <Testimonial
        text={comment.body}
        name={comment.user.name ?? ""}
        username={comment.user.username ?? ""}
        date={comment.createdAt}
        image={comment.user.image ?? ""}
      />
      <div className="flex flex-col gap-2">
        {canPin && (
          <PinComment
            commentId={comment.commentId}
            pinned={comment.pinned}
            onChange={onChange}
          />
        )}
        <RemoveComment commentId={comment.commentId} onChange={onChange} />
      </div>
    </div>
  )
}
