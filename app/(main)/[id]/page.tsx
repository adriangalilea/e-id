import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactCountryFlag from "react-country-flag";
import {
  getUser,
  getAllCommentsAndCommentatorsFromProfile,
  createCommentFromForm,
} from "@/db/actions";

export default async function Page({ params }: { params: { id: string } }) {
  const user_id = Number(params.id);
  const createCommentFromFormWithID = createCommentFromForm.bind(
    null,
    user_id,
    1
  );
  const user = await getUser(user_id);
  const allCommentsAndCommentators =
    await getAllCommentsAndCommentatorsFromProfile(user_id);

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
      <ReactCountryFlag
        svg
        countryCode={user.country_code}
        title={user.country_code}
        aria-label={`${user.country_code} country flag`}
        style={{
          width: "1.5em",
          height: "1.5em",
        }}
      />

      <p className="font-extralight">{user.bio}</p>

      <div>
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
                username={commentAndCommentator.users.username}
                timestamp={commentAndCommentator.comments?.created_at!}
                content={commentAndCommentator.comments?.body!}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
