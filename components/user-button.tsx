import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import { Separator } from "./ui/separator";

export default async function UserButton({
  username,
  image,
}: {
  username: string;
  image: string;
}) {
  return (
    <div className="flex w-full items-center justify-around sm:w-fit">
      <Button
        variant="ghost"
        className="w-full rounded-none hover:opacity-80 sm:w-fit"
        asChild
      >
        <Link href={`/${username}`} className="!p-0">
          <Avatar className="!size-10 rounded-none">
            <AvatarImage src={image} alt={username + " avatar"} />
            <AvatarFallback>
              {username.trim().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </Button>
      <Separator
        orientation="vertical"
        className="h-full !px-0 py-5 sm:hidden"
      />
    </div>
  );
}
