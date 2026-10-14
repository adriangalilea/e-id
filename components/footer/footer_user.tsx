"use client";

import Link from "next/link";
import { siGithub } from "simple-icons";
import { AccountMenu, ProviderGlyph } from "@/components/ui/account-menu";
import { DropdownMenuLinkItem } from "@/components/ui/menu";
import { useChip } from "@/components/session/use-chip";
import { signOut } from "@/lib/auth-client";
import { startSignIn } from "@/lib/sign-in";

/** The ways in the bar offers; the sign-in itself takes any of lib/handoff's. */
const PROVIDERS = [
  { id: "github", label: "github", icon: <ProviderGlyph icon={siGithub} /> },
] as const;

/** The bar's account (@ag/account-menu), drawn from the display cookie: "sign in
 *  with github" signed out; signed in, their face and address opening their menu.
 *  Signed in with no address yet (their provider's handle was taken), the menu
 *  leads to the home's card to pick one. Waiting until the page is the browser's,
 *  so the static page holds no guess. */
export default function FooterUser() {
  const chip = useChip();
  return (
    <AccountMenu
      size="lg"
      user={
        chip && {
          name: chip.u ?? "no address yet",
          image: chip.i,
          href: chip.u ? `/${chip.u}` : undefined,
        }
      }
      providers={PROVIDERS}
      onSignIn={startSignIn}
      onSignOut={() =>
        signOut().then(({ error }) => {
          if (error) throw new Error(`sign out: ${error.message}`);
          window.location.href = "/";
        })
      }
    >
      {chip && !chip.u && (
        <DropdownMenuLinkItem render={<Link href="/" />}>
          pick your address
        </DropdownMenuLinkItem>
      )}
    </AccountMenu>
  );
}
