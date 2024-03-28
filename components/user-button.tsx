import { SelectUser } from "@/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import CustomAvatar from "./custom_avatar";

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
          <CustomAvatar username={username!} image={image!} />
        </Link>
      </Button>
    </div>
  );
}
