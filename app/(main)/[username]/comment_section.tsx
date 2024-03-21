import {
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
    <div className="max-h-72 relative overflow-auto">
      {createCommentFromFormWithID && (
        <form
          action={createCommentFromFormWithID}
          className="sticky top-0 z-10"
        >
          <div className="flex items-center">
            <Input
              type="text"
              name="body"
              className="rounded-none bg-zinc-800/50 backdrop-blur-md focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus-visible:border-zinc-500"
              placeholder="I want everyone to know..."
            />
            <Button
              type="submit"
              className="rounded-none z-10"
              variant="secondary"
            >
              <Send size={18} strokeWidth={1} />
            </Button>
          </div>
        </form>
      )}
      <div className="flex flex-col px-4 py-2 gap-2 overflow-auto">
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
