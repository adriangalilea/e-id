import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";

export default async function UserButton({
  username,
  image,
}: {
  username: string;
  image: string;
}) {
  return (
    <div className="flex items-center justify-around">
      <Button
        variant="ghost"
        className="w-full rounded-none hover:opacity-80 !p-0"
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
    </div>
  );
}
