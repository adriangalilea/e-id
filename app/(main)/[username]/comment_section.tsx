import {
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
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
      {createCommentFromFormWithID && (
        <form
          action={createCommentFromFormWithID}
          className="sticky top-0 z-10"
        >
          <div className="flex items-center">
            <Input
              type="text"
              name="body"
              className="rounded-none bg-zinc-200/50 text-[16px] backdrop-blur-md focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-zinc-700/50"
              placeholder="I want everyone to know..."
            />
            <Button
              type="submit"
              className="z-10 rounded-none"
              variant="secondary"
            >
              <Send size={18} strokeWidth={1} />
            </Button>
          </div>
        </form>
      )}
      <div className="flex flex-col gap-2 overflow-auto px-4 py-2">
        {allCommentsAndCommentators.map((commentAndCommentator) => (
          <div key={commentAndCommentator.comments?.id}>
            <Comment
              profilePicture={commentAndCommentator.users.gh_image}
              username={commentAndCommentator.users.username}
              created_at={commentAndCommentator.comments?.created_at!}
              body={commentAndCommentator.comments?.body!}
              user_id={commentAndCommentator.users.id}
              updated_at={commentAndCommentator.comments?.updated_at!}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
