"use client"
import { SendHorizontal } from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { type CommentFormState, createComment } from "@/db/actions"

const initialState: CommentFormState = { error: null, resetKey: "" }

export default function CommentForm({
  profileUserId,
  onPosted,
}: {
  profileUserId: string
  onPosted: () => void
}) {
  const [state, formAction, sending] = useActionState(
    createComment.bind(null, profileUserId),
    initialState,
  )
  // What is written so far: the send waits for words (the server refuses an
  // empty vouch too, since anyone can call the action).
  const [body, setBody] = useState("")

  useEffect(() => {
    if (!state.resetKey) return
    setBody("")
    onPosted()
  }, [state.resetKey, onPosted])

  return (
    <form
      action={formAction}
      className="sticky top-0 z-10"
      key={state.resetKey}
    >
      <div className="flex items-center gap-2">
        <Textarea
          name="body"
          material="glass"
          size="lg"
          aria-label="vouch"
          placeholder="I want everyone to know..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          type="submit"
          aria-label="send"
          disabled={body.trim() === ""}
          loading={sending}
          className="z-10 shrink-0 grow-0 bg-zinc-500/20 shadow-md backdrop-blur-md"
          variant="ghost"
          size="icon-lg"
        >
          <SendHorizontal strokeWidth="1" />
        </Button>
      </div>
      {state.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
