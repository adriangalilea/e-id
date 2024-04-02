import { SelectComment, SelectUser } from "@/db/schema";
import { Testimonial } from "./quote";
import RemoveComment from "./remove_comment";
import PinComment from "./pin_comment";

export default async function Comment({
  body,
  date,
  name,
  profilePicture,
  username,
  commentId,
  pinned,
  canPin,
}: {
  body: SelectUser["bio"];
  date: SelectUser["created_at"];
  name: SelectUser["name"];
  profilePicture: SelectUser["image"];
  username: SelectUser["username"];
  commentId: SelectComment["id"];
  pinned: SelectComment["pinned"];
  canPin: boolean;
}): Promise<JSX.Element> {
  return (
    <div className="flex items-start gap-2">
      <Testimonial
        text={body!}
        name={name!}
        username={username!}
        date={date}
        image={profilePicture!}
      />
      <div className="flex flex-col gap-2">
        <PinComment commentId={commentId} pinned={pinned} canPin={canPin} />
        <RemoveComment commentId={commentId} />
      </div>
    </div>
  );
}
