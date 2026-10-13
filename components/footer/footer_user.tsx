"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChip } from "@/components/session/use-chip";
import UserButton from "../user-button";
import { SignIn, SignOut } from "../auth-components-client";

/** The footer's account corner, drawn from the display cookie: sign in, the
 *  user's avatar and sign out, or the way to /null for a user who has no
 *  username yet, where every page sends them. Empty and the same size until the
 *  page is the browser's, so the static page holds no guess. */
export default function FooterUser() {
  const chip = useChip();
  const router = useRouter();
  const needsUsername = chip !== undefined && chip !== null && !chip.u;

  // Read from window, not usePathname: the footer is in every page's static
  // shell, and the path is data the shell of a dynamic route does not have.
  useEffect(() => {
    if (needsUsername && window.location.pathname !== "/null")
      router.replace("/null");
  }, [needsUsername, router]);

  if (chip === undefined) return <div className="size-10" aria-hidden />;
  if (chip === null) return <SignIn />;
  if (!chip.u)
    return (
      <Button
        asChild
        variant="ghost"
        className="relative h-10! w-10! p-0! hover:bg-orange-500/10"
      >
        <Link href="/null" aria-label="fix profile null alert">
          <TriangleAlert strokeWidth={1.5} className="text-orange-500" />
        </Link>
      </Button>
    );
  return (
    <div className="flex gap-2">
      <UserButton username={chip.u} image={chip.i} />
      <SignOut />
    </div>
  );
}
