import {
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
} from "@/db/actions";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default async function CommentSection({
  profileUserId,
  visitorUserId,
}: {
  profileUserId: string;
  visitorUserId: string | null | undefined;
}) {
  if (!visitorUserId) return null;
  console.log("whatever");
  const createCommentFromFormWithID = createCommentFromForm.bind(
    null,
    profileUserId,
    visitorUserId,
  );
  const allCommentsAndCommentators =
    await getAllCommentsAndCommentatorsFromProfile(profileUserId);

  return (
    <div>
      <Separator className="mb-2" />
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
