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
  console.log(profileUserId, visitorUserId);
  comments?.map((comment) =>
    console.log(
      comment.body,
      comment.createdAt,
      comment.user.name,
      comment.user.username,
      comment.commentId,
    ),
  );

  return (
    <div className="relative max-h-72 overflow-auto">
      {createCommentFromFormWithID ? (
        <form
          action={createCommentFromFormWithID}
          className="sticky top-0 z-10"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              name="body"
              className="bg-zinc-200/60 text-[16px] opacity-60 backdrop-blur-md"
              placeholder="I want everyone to know..."
            />
            <Button
              type="submit"
              className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0"
              variant="ghost"
            >
              <SendHorizontal strokeWidth="1" className="opacity-60" />
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="sticky top-0 z-10"
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <div className="flex items-center gap-2">
            <Input
              disabled
              type="text"
              name="body"
              className="bg-zinc-200/60 text-[16px] opacity-60 backdrop-blur-md"
              placeholder="I want everyone to know..."
            />
            <Button
              disabled
              type="submit"
              className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0"
              variant="ghost"
            >
              <SendHorizontal strokeWidth="1" className="opacity-60" />
            </Button>
          </div>
        </form>
      )}
      <div className="flex flex-col gap-2 overflow-auto">
        {comments &&
          comments.map((comment) => (
            <div key={comment.commentId}>
              <Comment
                profilePicture={comment.user.image}
                name={comment.user.name}
                username={comment.user.username}
                created_at={comment.createdAt}
                body={comment.body}
                commentId={comment.commentId}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
