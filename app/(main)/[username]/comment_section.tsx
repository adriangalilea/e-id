import {
  getAllCommentsAndCommentatorsFromProfile,
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
  if (visitorUserId) {
    createCommentFromFormWithID = createCommentFromForm.bind(
      null,
      profileUserId,
      visitorUserId,
    );
  }
  const allCommentsAndCommentators =
    await getAllCommentsAndCommentatorsFromProfile(profileUserId);

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
              className="bg-zinc-200/60 text-[16px] backdrop-blur-md"
              placeholder="I want everyone to know..."
            />
            <Button
              type="submit"
              className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0"
              variant="ghost"
            >
              <SendHorizontal strokeWidth={1} />
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
              className="bg-zinc-200/60 text-[16px] backdrop-blur-md focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-zinc-700/80 sm:dark:bg-zinc-800/60"
              placeholder="I want everyone to know..."
            />
            <Button
              disabled
              type="submit"
              className="z-10 !h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0"
              variant="ghost"
            >
              <SendHorizontal strokeWidth={1} />
            </Button>
          </div>
        </form>
      )}
      <div className="flex flex-col gap-2 overflow-auto">
        {allCommentsAndCommentators
          .filter(
            (commentAndCommentator) =>
              visitorUserId === profileUserId ||
              visitorUserId === commentAndCommentator.users.id,
          )
          .map((commentAndCommentator) => (
            <div key={commentAndCommentator.comments?.id}>
              <Comment
                profilePicture={commentAndCommentator.users.image}
                name={commentAndCommentator.users.name}
                username={commentAndCommentator.users.username}
                created_at={commentAndCommentator.comments?.created_at!}
                body={commentAndCommentator.comments?.body!}
                user_id={commentAndCommentator.users.id}
                updated_at={commentAndCommentator.comments?.updated_at!}
                commentId={commentAndCommentator.comments?.id!}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
