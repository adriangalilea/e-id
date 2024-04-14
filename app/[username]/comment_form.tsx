"use client";

import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFormState } from "react-dom";
import { createCommentFromForm } from "@/db/actions";

export default function CommentForm({
  profileUserId,
}: {
  profileUserId: string;
}) {
  const actionFunction = (
    prevState: { resetKey: string; error: string | null },
    formData: FormData,
  ) => createCommentFromForm(prevState, formData, profileUserId);

  const [state, formAction] = useFormState(actionFunction, {
    error: null,
    resetKey: Date.now().toString(),
  });

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
          className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0 shadow-md backdrop-blur-md"
          variant="ghost"
        >
          <SendHorizontal strokeWidth="1" />
        </Button>
      </div>
      {state.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
