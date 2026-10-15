"use client"

// THE WAY IN AND THE ACCOUNT, one control in a bar's corner, for any auth library: it
// takes who is signed in and two callbacks, and never imports a client of its own.
//
//   signed out, one provider:  one button, the provider's mark and its words
//                              ("sign in with github"), a press signs in;
//   signed out, several:       one "sign in" button opening a menu of the providers;
//   signed in:                 the person's face and name, opening their menu: the
//                              profile link (`user.href`), the consumer's own rows
//                              (`children`), sign out;
//   not known yet (`user` undefined): the signed-out control, waiting, so the bar
//                              holds its height and the likeliest width.
//
// A press that signs in or out waits on the promise its callback returns: the control
// turns a spinner (Button's `loading`, its width kept) from the press until the page
// leaves or `user` changes, and gives the press back if the promise rejects. A
// callback that resolves without leaving or changing the session must reject (an auth
// client that answers `{ error }` instead of throwing is wrapped to throw). Back from
// the provider through the browser's back/forward cache, the press is given back.
//
// Built from Button, Avatar and the menu's dropdown; plain or glass through
// `material`, its colour scheme through `scheme`. Every part carries a `data-slot`
// (`account-menu`, `account-menu-avatar`, `account-menu-initial`, `account-menu-name`),
// which is also where a host that paints the control before hydration (from a cookie
// of who was signed in) fills the name, the initial and the picture.

import { ChevronDown, CircleUserRound, LogOut, UserRound } from "lucide-react"
import * as React from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  type Material,
  type Scheme,
  useMaterial,
} from "@/components/ui/material"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu"
import { cn } from "@/lib/utils"

/** Who is signed in, as the control draws them. */
export type AccountUser = {
  name: string
  /** Their picture; without one, the name's first letter in a disc. */
  image?: string | null
  /** Their page: the menu's first row, "profile". */
  href?: string
}

/** A way in: `id` is what `onSignIn` is called with, `label` its name in words
 *  ("github"), `icon` its mark (`ProviderGlyph`, or any glyph). */
export type AccountProvider<P extends string = string> = {
  id: P
  label: string
  icon?: React.ReactNode
}

/** What a press answers with: the promise the control waits on, or anything else
 *  (nothing), which it does not wait on. */
type Press = unknown

export type AccountMenuSize = "md" | "lg"

/** The face at the pill's start, concentric with its round end: the pill's height
 *  less the 4 px it is inset by (`pl-1`). */
const FACE: Record<AccountMenuSize, string> = { md: "size-6", lg: "size-8" }

/** A brand's mark from a 24-unit path (simple-icons' shape: `{ path }`), in the
 *  current colour, sized by whatever holds it (a button's icon slot, a menu row). */
export function ProviderGlyph({
  icon,
  className,
}: {
  icon: { path: string }
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
      data-slot="provider-glyph"
      className={className}
    >
      <path d={icon.path} />
    </svg>
  )
}

/** A press that waits on its callback's promise: busy from the press until it
 *  rejects, the page leaves, or the state that drew it is replaced. Restored from the
 *  back/forward cache, the page gives the press back. */
function usePress(): [boolean, (run: () => Press) => void] {
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false)
    }
    window.addEventListener("pageshow", restored)
    return () => window.removeEventListener("pageshow", restored)
  }, [])
  const press = React.useCallback((run: () => Press) => {
    const answer = run()
    if (!(answer instanceof Promise)) return
    setBusy(true)
    answer.catch((error: unknown) => {
      setBusy(false)
      throw error
    })
  }, [])
  return [busy, press]
}

/** The ways in, dropped from any trigger: the account control's "sign in", or a
 *  control that needs a session where the person is (a vote: `reason` heads the list
 *  with what the sign in is for). */
export function SignInMenu<P extends string>({
  providers,
  onSignIn,
  trigger,
  reason,
  material,
  scheme,
}: {
  providers: readonly AccountProvider<P>[]
  onSignIn: (provider: P) => Press
  /** The element that opens it (a Button). */
  trigger: React.ReactElement
  reason?: React.ReactNode
  material?: Material
  scheme?: Scheme
}) {
  if (providers.length === 0)
    throw new Error("SignInMenu: no providers to sign in with")
  const m = useMaterial(material)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent material={m} scheme={scheme}>
        {reason && (
          <>
            <DropdownMenuLabel>{reason}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {providers.map((provider) => (
          <DropdownMenuItem
            key={provider.id}
            data-provider={provider.id}
            onClick={() => onSignIn(provider.id)}
          >
            {provider.icon}
            {provider.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const CHEVRON = (
  <ChevronDown
    aria-hidden
    className="transition-transform group-data-[popup-open]:rotate-180"
  />
)

function SignedOut<P extends string>({
  providers,
  onSignIn,
  waiting,
  label,
  material,
  scheme,
  size,
  className,
}: {
  providers: readonly AccountProvider<P>[]
  onSignIn: (provider: P) => Press
  waiting: boolean
  label?: React.ReactNode
  material: Material
  scheme?: Scheme
  size: AccountMenuSize
  className?: string
}) {
  const [busy, press] = usePress()
  const only = providers.length === 1 ? providers[0] : null
  if (only)
    return (
      <Button
        data-slot="account-menu"
        data-state="signed-out"
        material={material}
        scheme={scheme}
        size={size}
        loading={waiting || busy}
        icon={only.icon}
        onClick={() => press(() => onSignIn(only.id))}
        className={className}
      >
        {label ?? `sign in with ${only.label}`}
      </Button>
    )
  return (
    <SignInMenu
      providers={providers}
      onSignIn={(id) => press(() => onSignIn(id))}
      material={material}
      scheme={scheme}
      trigger={
        <Button
          data-slot="account-menu"
          data-state="signed-out"
          material={material}
          scheme={scheme}
          size={size}
          loading={waiting || busy}
          icon={
            // A 1.5 px line on screen at every size: the face is drawn larger
            // than Lucide's 24 px grid (32 px at lg), where a relative 1.5 came
            // out a 2 px line, heavy beside the words.
            <CircleUserRound
              strokeWidth={1.5}
              absoluteStrokeWidth
              className={cn(FACE[size], "-my-1")}
            />
          }
          iconEnd={CHEVRON}
          className={cn("group pl-1", className)}
        >
          {label ?? "sign in"}
        </Button>
      }
    />
  )
}

function SignedIn({
  user,
  onSignOut,
  children,
  material,
  scheme,
  size,
  className,
}: {
  user: AccountUser
  onSignOut: () => Press
  children?: React.ReactNode
  material: Material
  scheme?: Scheme
  size: AccountMenuSize
  className?: string
}) {
  const [busy, press] = usePress()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-slot="account-menu"
            data-state="signed-in"
            aria-label={`account, ${user.name}`}
            material={material}
            scheme={scheme}
            size={size}
            loading={busy}
            iconEnd={CHEVRON}
            className={cn("group gap-2 pl-1", className)}
          >
            <span
              data-slot="account-menu-avatar"
              className={cn(
                "relative grid shrink-0 place-items-center rounded-full bg-current/12",
                FACE[size],
              )}
            >
              <span
                data-slot="account-menu-initial"
                aria-hidden
                className="text-[11px] leading-none lowercase"
              >
                {user.name.charAt(0)}
              </span>
              {user.image && (
                <Avatar
                  src={user.image}
                  alt=""
                  size="sm"
                  className="absolute inset-0 size-full"
                />
              )}
            </span>
            <span
              data-slot="account-menu-name"
              className="max-w-[12ch] truncate"
            >
              {user.name}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent
        material={material}
        scheme={scheme}
        className="min-w-44"
      >
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.href && (
          <DropdownMenuLinkItem href={user.href}>
            <UserRound aria-hidden />
            profile
          </DropdownMenuLinkItem>
        )}
        {children}
        {(user.href || children) && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => press(onSignOut)}>
          <LogOut aria-hidden />
          sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type AccountMenuProps<P extends string> = {
  /** Who is signed in; `null` signed out; `undefined` not known yet (the
   *  signed-out control, waiting). */
  user: AccountUser | null | undefined
  /** The ways in, at least one: one is a button, several a menu. */
  providers: readonly AccountProvider<P>[]
  onSignIn: (provider: P) => Press
  onSignOut: () => Press
  /** The signed-out control's words: default "sign in with <provider>" for one,
   *  "sign in" for several. */
  label?: React.ReactNode
  /** Rows of the signed-in menu, between the profile and sign out
   *  (`DropdownMenuItem`, `DropdownMenuLinkItem`). */
  children?: React.ReactNode
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** Button's heights: 32 px or 40 px. */
  size?: AccountMenuSize
  /** On the trigger, whichever state it is in. */
  className?: string
}

export function AccountMenu<P extends string>({
  user,
  providers,
  onSignIn,
  onSignOut,
  label,
  children,
  material,
  scheme,
  size = "md",
  className,
}: AccountMenuProps<P>) {
  if (providers.length === 0)
    throw new Error("AccountMenu: no providers to sign in with")
  const m = useMaterial(material)
  if (user)
    return (
      <SignedIn
        user={user}
        onSignOut={onSignOut}
        material={m}
        scheme={scheme}
        size={size}
        className={className}
      >
        {children}
      </SignedIn>
    )
  return (
    <SignedOut
      providers={providers}
      onSignIn={onSignIn}
      waiting={user === undefined}
      label={label}
      material={m}
      scheme={scheme}
      size={size}
      className={className}
    />
  )
}
