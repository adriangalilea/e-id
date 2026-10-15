"use client"

import { useCallback, useEffect, useState } from "react"
import Comment from "@/components/comment"
import { useChip, writeChip } from "@/components/session/use-chip"
import { type CommentThread, loadComments } from "@/db/actions"
import CommentForm from "./comment_form"

/** The signed-in part of a profile's comments, on a page that is otherwise
 *  static: nothing for a visitor the display cookie says is signed out (no
 *  request at all), else the thread loaded from the server, which also corrects
 *  the cookie from the real session. */
export function CommentInteraction({
  profileUserId,
}: {
  profileUserId: string
}) {
  const chip = useChip()
  const [thread, setThread] = useState<CommentThread | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  const signedIn = Boolean(chip)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the reload's trigger (`reload` bumps it), read by no line of the effect on purpose
  useEffect(() => {
    if (!signedIn) return
    let current = true
    loadComments(profileUserId).then((loaded) => {
      if (!current) return
      writeChip(loaded?.viewer ?? null)
      setThread(loaded)
    })
    return () => {
      current = false
    }
  }, [signedIn, profileUserId, version])

  if (!chip || !thread) return null

  if (thread.isOwner && thread.comments.length === 0) return null

  return (
    <div className="relative animate-fade-in">
      {!thread.isOwner && (
        <CommentForm profileUserId={profileUserId} onPosted={reload} />
      )}
      <div className="my-2 flex flex-col gap-2">
        {thread.comments.map((comment) => (
          <Comment
            key={comment.commentId}
            comment={comment}
            canPin={thread.isOwner}
            onChange={reload}
          />
        ))}
      </div>
    </div>
  )
}

/** The pinned testimonials are part of the static page; the profile's owner sees
 *  them in their own comment list instead, with the pin beside each. */
export function HiddenFromOwner({
  username,
  children,
}: {
  username: string
  children: React.ReactNode
}) {
  const chip = useChip()
  if (chip?.u?.toLowerCase() === username.toLowerCase()) return null
  return children
}
