import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { auth } from "@/auth";
import { SignIn, SignOut } from "./auth-components";
import Link from "next/link";

export default async function UserButton() {
  const session = await auth();
  if (!session?.user) return <SignIn />;
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        className="rounded-none"
        asChild
      >
        <Link href={`/${session.user.username}`}>
          <Avatar className="w-6 h-6">
            {session.user.gh_image && (
              <AvatarImage
                src={session.user.gh_image}
                alt={session.user.name ?? ""}
              />
            )}
            <AvatarFallback>{session.user.username}</AvatarFallback>
          </Avatar>
          <span className="text-sm antialiased sm:inline-flex ml-2">
            {session.user.name}
          </span>
        </Link>
      </Button>
      <SignOut />
    </div>
  );
}
