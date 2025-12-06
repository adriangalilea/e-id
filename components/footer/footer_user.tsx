import { auth } from "@/auth";
import UserButton from "../user-button";
import { SignIn, SignOut } from "../auth-components-client";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

export default async function FooterUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (
    <div className="flex">
      {session ? (
        session.user?.username && session.user?.username_normalized ? (
          <div className="flex gap-2">
            <UserButton
              username={session.user.username}
              image={session.user.image || null}
            />
            <SignOut />
          </div>
        ) : (
          <Button
            asChild
            variant="ghost"
            className="relative h-10! w-10! p-0! hover:bg-orange-500/10"
          >
            <Link href={`/null`} aria-label="fix profile null alert">
              <TriangleAlert strokeWidth={1.5} className="text-orange-500" />
            </Link>
          </Button>
        )
      ) : (
        <SignIn />
      )}
    </div>
  );
}
