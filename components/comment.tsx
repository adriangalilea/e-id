import { SelectComment, SelectUser } from "@/db/schema";
import { Button } from "./ui/button";
import { Pin, PinOff, X } from "lucide-react";
import { deleteComment, pinCommentToggle } from "@/db/actions";
import { Testimonial } from "./quote";

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
    <div className="mt-2 flex items-start gap-2">
      <Testimonial
        text={body!}
        name={name!}
        username={username!}
        date={date}
        image={profilePicture!}
      />
      <div className="flex flex-col gap-2">
        <form
          action={async () => {
            "use server";
            await deleteComment(commentId);
          }}
        >
          <Button
            variant="destructiveGhost"
            size="icon"
            className="bg-zinc-500/20"
          >
            <X strokeWidth={1} className="opacity-60" />
          </Button>
        </form>
        {canPin && (
          <form
            action={async () => {
              "use server";
              await pinCommentToggle(commentId);
            }}
          >
            <Button variant="ghost" size="icon" className="bg-zinc-500/20">
              {pinned ? (
                <PinOff strokeWidth={1} className="opacity-60" />
              ) : (
                <Pin strokeWidth={1} className="opacity-60" />
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
