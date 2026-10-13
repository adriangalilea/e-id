"use client";

import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { startSignIn } from "@/lib/sign-in";

/** The site bar's way in: plainly "sign in", for whoever comes back to their page
 *  as much as for whoever makes one (the hero's address is the invitation to make
 *  one). No provider's mark: how one signs in is the sign-in's business. */
export function SignIn() {
  return (
    <Button size="lg" className="px-4" onClick={() => startSignIn()}>
      sign in
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
