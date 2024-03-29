import {
  fetchCommentsConditionally,
  createCommentFromForm,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal } from "lucide-react";
import { signIn } from "@/auth";
// import { useState } from "react";

export default async function CommentSection({
  profileUserId,
  visitorUserId,
}: {
  profileUserId: string;
  visitorUserId: string | null | undefined;
}) {
  // TODO: make the form into a client component
  // const [commenntText, setCommentText] = useState("");
  let createCommentFromFormWithID = null;
  let comments = null;
  if (visitorUserId) {
    createCommentFromFormWithID = createCommentFromForm.bind(
      null,
      profileUserId,
      visitorUserId,
    );
  }

  if (visitorUserId) {
    comments = await fetchCommentsConditionally(profileUserId, visitorUserId);
  }

  const formAction =
    createCommentFromFormWithID ||
    (async () => {
      "use server";
      await signIn("github");
    });

  return (
    <div className="relative overflow-auto">
      <form action={formAction} className="sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <Input
            disabled={!visitorUserId}
            type="text"
            name="body"
            className="bg-zinc-200/60 text-[16px] backdrop-blur-md"
            placeholder="I want everyone to know..."
          />
          <Button
            disabled={!visitorUserId}
            type="submit"
            className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0 backdrop-blur-md shadow-md"
            variant="ghost"
          >
            <SendHorizontal strokeWidth="1" className="opacity-60" />
          </Button>
        </div>
      </form>
      <div className="flex flex-col gap-2 overflow-auto mt-2">
        {comments &&
          comments.map((comment) => (
            <div key={comment.commentId}>
              <Comment
                profilePicture={comment.user.image}
                name={comment.user.name}
                username={comment.user.username}
                date={comment.createdAt}
                body={comment.body}
                commentId={comment.commentId}
                pinned={comment.pinned}
                canPin={visitorUserId === profileUserId}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
