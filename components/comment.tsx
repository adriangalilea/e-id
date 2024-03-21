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
      <article className="flex items-start flex-col prose dark:prose-invert prose-zinc">
        <header className="flex items-center gap-2">
          <h4 className="flex items-center !mt-0 !mb-0">
            <Link
              href={`/${username}`}
              className="no-underline hover:underline"
            >
              {username}
            </Link>
          </h4>
          <HumanTime date={created_at} />
        </header>
        <p className="flex !mt-0">{body}</p>
      </article>
    </div>
  );
}
