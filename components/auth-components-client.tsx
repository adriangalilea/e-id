"use client";

import { Button } from "./ui/button";
import { LogOut, UserRound } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { startSignIn } from "@/lib/sign-in";

export function SignIn() {
  return (
    <Button
      aria-label="sign-in"
      variant="ghost"
      size="icon-lg"
      onClick={() => startSignIn()}
    >
      <UserRound strokeWidth={1} />
    </Button>
  );
}

export function SignOut() {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="hover:bg-tone-bad/15 hover:text-tone-bad"
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
