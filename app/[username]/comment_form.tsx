"use client";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { createComment, type CommentFormState } from "@/db/actions";

const initialState: CommentFormState = { error: null, resetKey: "" };

export default function CommentForm({
  profileUserId,
  onPosted,
}: {
  profileUserId: string;
  onPosted: () => void;
}) {
  const [state, formAction] = useActionState(
    createComment.bind(null, profileUserId),
    initialState,
  );

  useEffect(() => {
    if (state.resetKey) onPosted();
  }, [state.resetKey, onPosted]);

  return (
    <form
      action={formAction}
      className="sticky top-0 z-10"
      key={state.resetKey}
    >
      <div className="flex items-center gap-2">
        <Textarea
          name="body"
          className="border-border border bg-zinc-200/10 text-[16px] shadow-md backdrop-blur-md"
          placeholder="I want everyone to know..."
        />
        <Button
          type="submit"
          className="z-10 h-10! w-10! shrink-0 grow-0 bg-zinc-500/20 p-0! shadow-md backdrop-blur-md"
          variant="ghost"
        >
          <SendHorizontal strokeWidth="1" />
        </Button>
      </div>
      {state.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
