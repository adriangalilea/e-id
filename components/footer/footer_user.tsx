"use client"

import Link from "next/link"
import { useEffect } from "react"
import { SIGN_IN_PROVIDERS } from "@/components/session/sign-in-providers"
import { useChip } from "@/components/session/use-chip"
import { AccountMenu } from "@/components/ui/account-menu"
import { DropdownMenuLinkItem } from "@/components/ui/menu"
import { toast } from "@/components/ui/toast"
import { signOut } from "@/lib/auth-client"
import {
  SIGN_IN_ERROR_PARAM,
  signInErrorMessage,
  startSignIn,
} from "@/lib/sign-in"

/** The bar's account (@ag/account-menu), drawn from the display cookie: "sign in"
 *  signed out, opening the ways in; signed in, their face and address opening
 *  their menu. Signed in with no address yet (their provider's handle was taken),
 *  the menu leads to the home's card to pick one. Waiting until the page is the
 *  browser's, so the static page holds no guess. A sign-in that failed comes back
 *  to the page it started from with its reason in the address: said once, then
 *  cleared from it. */
export default function FooterUser() {
  const chip = useChip()
  useSignInError()
  return (
    <AccountMenu
      // A secondary control in the bar: the brand leads it (`--wordmark-logo`
      // is this size's face).
      size="md"
      user={
        chip && {
          name: chip.u ?? "no address yet",
          image: chip.i,
          href: chip.u ? `/${chip.u}` : undefined,
        }
      }
      providers={SIGN_IN_PROVIDERS}
      onSignIn={startSignIn}
      onSignOut={() =>
        signOut().then(({ error }) => {
          if (error) throw new Error(`sign out: ${error.message}`)
          window.location.href = "/"
        })
      }
    >
      {chip && !chip.u && (
        <DropdownMenuLinkItem render={<Link href="/" />}>
          pick your address
        </DropdownMenuLinkItem>
      )}
    </AccountMenu>
  )
}

/** The reason a sign-in came back with (`?error=`), said as a toast, and the
 *  address cleaned so a reload or a shared link does not say it again. */
function useSignInError() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get(SIGN_IN_ERROR_PARAM)
    if (!code) return
    toast.error("couldn't sign you in", {
      description: signInErrorMessage(code),
    })
    url.searchParams.delete(SIGN_IN_ERROR_PARAM)
    window.history.replaceState(window.history.state, "", url)
  }, [])
}
