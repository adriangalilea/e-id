import {
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default async function CommentSection({ userId }: { userId: string }) {
  const createCommentFromFormWithID = createCommentFromForm.bind(
    null,
    userId,
    1
  );
  const allCommentsAndCommentators =
    await getAllCommentsAndCommentatorsFromProfile(userId);

  return (
    <div>
      <Separator  className="mb-2"/>
      <form action={createCommentFromFormWithID}>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input type="text" name="body" placeholder="Comment" />
          <Button type="submit">add comment</Button>
        </div>
      </form>
      <div className="flex flex-col px-4 py-2 gap-2">
        {allCommentsAndCommentators.map((commentAndCommentator) => (
          <div key={commentAndCommentator.comments?.id}>
            <Comment
              profilePicture={commentAndCommentator.users.avatar!}
              username={commentAndCommentator.users.username!}
              timestamp={commentAndCommentator.comments?.created_at!}
              content={commentAndCommentator.comments?.body!}
              user_id={commentAndCommentator.users.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
