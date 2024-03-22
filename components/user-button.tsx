import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { auth } from "@/auth";
import { SignIn, SignOut } from "./auth-components";
import Link from "next/link";
import { Separator } from "./ui/separator";

export default async function UserButton() {
  const session = await auth();
  if (!session?.user) return <SignIn />;
  return (
    <div className="flex w-full items-center justify-around sm:w-fit">
      <Button variant="ghost" className="w-full rounded-none sm:w-fit" asChild>
        <Link href={`/${session.user.username}`}>
          <Avatar className="h-6 w-6 rounded-none">
            {session.user.gh_image && (
              <AvatarImage
                src={session.user.gh_image}
                alt={session.user.name ?? ""}
              />
            )}
            <AvatarFallback>{session.user.username}</AvatarFallback>
          </Avatar>
        </Link>
      </Button>
      <Separator
        orientation="vertical"
        className="px-0! h-full py-5 sm:hidden"
      />
      <SignOut />
    </div>
  );
}
