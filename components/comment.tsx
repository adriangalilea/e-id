import { SelectComment, SelectUser } from "@/db/schema";
import { Button } from "./ui/button";
import { Pin, PinOff } from "lucide-react";
import { pinCommentToggle } from "@/db/actions";
import { Testimonial } from "./quote";
import RemoveComment from "./remove_comment";

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
        {canPin && (
          <form
            action={async () => {
              "use server";
              await pinCommentToggle(commentId);
            }}
          >
            <Button variant="outline" size="icon">
              {pinned ? <PinOff strokeWidth={1} /> : <Pin strokeWidth={1} />}
            </Button>
          </form>
        )}
        <RemoveComment commentId={commentId} />
      </div>
    </div>
  );
}
