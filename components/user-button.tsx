import { SelectUser } from "@/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";

export default async function UserButton({
  username,
  image,
}: {
  username: SelectUser["username"];
  image: SelectUser["image"];
}) {
  return (
    <div className="flex items-center justify-around">
      <Button
        variant="ghost"
        className="w-full !p-0 transition-opacity ease-out hover:opacity-80"
        asChild
      >
        <Link href={`/${username}`} className="!p-0">
          <Avatar className="!size-10 ">
            <AvatarImage src={image || ""} alt={username + " avatar"} />
            <AvatarFallback>
              {username ? username.trim().slice(0, 2).toUpperCase() : "ID"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </Button>
    </div>
  );
}
