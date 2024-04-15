"use client";

import { Button } from "./ui/button";
import { LogOut, UserRound } from "lucide-react";

import { signIn, signOut } from "next-auth/react";

export function SignIn({
  provider,
  ...props
}: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
  return (
    <Button
      aria-label="sign-in"
      variant="ghost"
      size="icon"
      {...props}
      onClick={() => signIn(provider)}
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
      aria-label="sign-in"
      onClick={() => signOut()}
    >
      <LogOut strokeWidth={1} />
    </Button>
  );
}

// export function SignIn({
//   provider,
//   ...props
// }: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
//   return (
//     <form
//       className="w-full sm:w-fit"
//       action={async () => {
//         "use server";
//         await signIn(provider);
//       }}
//     >
//       <Button variant="ghost" className="!h-10 !w-10 !p-0" {...props}>
// <UserRound strokeWidth={1} />
//       </Button>
//     </form>
//   );
// }
// export function SignOut(props: React.ComponentPropsWithRef<typeof Button>) {
//   return (
//     <form
//       action={async () => {
//         "use server";
//         await signOut();
//       }}
//     >
//       <Button
//         variant="destructiveGhost"
//         className="!h-10 !w-10 !p-0"
//         {...props}
//         aria-label="sign-in"
//       >
//         <LogOut strokeWidth={1} />
//       </Button>
//     </form>
//   );
// }
