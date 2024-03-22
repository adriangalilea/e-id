import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HumanTime from "./human_date";
import Link from "next/link";
import { SelectUser } from "@/db/schema";

interface CommentProps {
  profilePicture: SelectUser["avatar"];
  username: SelectUser["username"];
  created_at: SelectUser["created_at"];
  updated_at: SelectUser["updated_at"];
  body: SelectUser["bio"];
  user_id: SelectUser["id"];
}

export default function Comment(props: CommentProps) {
  const { profilePicture, username, created_at, updated_at, body, user_id } =
    props;

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src={profilePicture!} />
        <AvatarFallback>{username}</AvatarFallback>
      </Avatar>
      <article className="prose prose-zinc flex flex-col items-start dark:prose-invert">
        <header className="flex items-center gap-2">
          <h4 className="!mb-0 !mt-0 flex items-center">
            <Link
              href={`/${username}`}
              className="no-underline hover:underline"
            >
              {username}
            </Link>
          </h4>
          <HumanTime date={created_at} />
        </header>
        <p className="!mt-0 flex">{body}</p>
      </article>
    </div>
  );
}
