import HumanTime from "./human_date";
import Link from "next/link";
import { SelectUser } from "@/db/schema";
import UserButton from "./user-button";

interface CommentProps {
  profilePicture: SelectUser["avatar"];
  name: SelectUser["name"];
  username: SelectUser["username"];
  created_at: SelectUser["created_at"];
  updated_at: SelectUser["updated_at"];
  body: SelectUser["bio"];
  user_id: SelectUser["id"];
}

export default function Comment(props: CommentProps) {
  const {
    profilePicture,
    name,
    username,
    created_at,
    updated_at,
    body,
    user_id,
  } = props;

  return (
    <div className="flex items-start gap-2">
      <UserButton username={username!} image={profilePicture!} />
      <article className="prose prose-zinc dark:prose-invert flex w-full items-center justify-between border-l border-zinc-500 bg-zinc-500/10 px-3 py-1.5">
        <p className="!m-0 text-pretty italic">{body}</p>
        <header className="flex items-center gap-2">
          <Link href={`/${username}`} className="no-underline hover:underline">
            <span className="whitespace-nowrap font-extralight">{name}</span>
          </Link>

          <HumanTime date={created_at} dateOnly={true} />
        </header>
      </article>
    </div>
  );
}
