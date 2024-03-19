import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
  getUserByUsername,
} from "@/db/actions";
import Flag from "@/components/flag";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  // const createCommentFromFormWithID = createCommentFromForm.bind(
  //   null,
  //   params.username,
  //   1
  // );
  const user = await getUserByUsername(params.username);
  console.log(user);
  // const allCommentsAndCommentators =
  //   await getAllCommentsAndCommentatorsFromProfile(params.username);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p>
          👤 {user.name}
          <span className="ml-2 font-extralight opacity-70">
            @{user.username}
          </span>
        </p>
      </div>
      <Flag country={user.country_code} />

      <p className="font-extralight">{user.bio}</p>

      {/* <div>
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
      </div> */}
    </div>
  );
}