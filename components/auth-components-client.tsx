"use client";

import { Button } from "./ui/button";
import { LogOut, UserRound } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { startSignIn } from "@/lib/sign-in";

export function SignIn(props: React.ComponentPropsWithRef<typeof Button>) {
  return (
    <Button
      aria-label="sign-in"
      variant="ghost"
      size="icon"
      {...props}
      onClick={() => startSignIn()}
    >
      <UserRound strokeWidth={1} />
    </Button>
  );
}

export function SignOut(props: React.ComponentPropsWithRef<typeof Button>) {
  return (
    <Button
      variant="destructiveGhost"
      size="icon"
      {...props}
      aria-label="sign-out"
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/";
            },
          },
        });
      }}
    >
      <LogOut strokeWidth={1} />
    </Button>
  );
}
