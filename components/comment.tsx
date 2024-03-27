import HumanTime from "./human_date";
import Link from "next/link";
import { SelectComment, SelectUser } from "@/db/schema";
import UserButton from "./user-button";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { deleteComment } from "@/db/actions";

export default async function Comment({
  body,
  created_at,
  name,
  profilePicture,
  username,
  commentId,
}: {
  body: SelectUser["bio"];
  created_at: SelectUser["created_at"];
  name: SelectUser["name"];
  profilePicture: SelectUser["image"];
  username: SelectUser["username"];
  commentId: SelectComment["id"];
}): Promise<JSX.Element> {
  return (
    <form
      action={async () => {
        "use server";
        await deleteComment(commentId);
      }}
      className="mt-2 flex items-start gap-2"
    >
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
      <Button
        variant="destructiveGhost"
        className="!h-10 !w-10 shrink-0 grow-0 bg-zinc-500/20 !p-0"
      >
        <X strokeWidth={1} />
      </Button>
    </form>
  );
}
