"use client";

import { Button } from "./ui/button";
import { Github, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { startSignIn } from "@/lib/sign-in";

/** The site bar's way in for a visitor who has no page: signing in with GitHub IS
 *  making one, so it says so, in the home's own words. The one place the site asks
 *  a visitor to join, in its own chrome rather than under somebody's profile. */
export function SignIn() {
  return (
    <Button size="lg" className="gap-2 px-4" onClick={() => startSignIn()}>
      <Github strokeWidth={1.5} aria-hidden />
      make yours
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
