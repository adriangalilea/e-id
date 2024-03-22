import { signIn, signOut } from "@/auth";
import { Button } from "./ui/button";
import { LogIn, LogOut } from "lucide-react";

export function SignIn({
  provider,
  ...props
}: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
  return (
    <form
      className="w-full sm:w-fit"
      action={async () => {
        "use server";
        await signIn(provider);
      }}
    >
      <Button
        variant="ghost"
        className="w-full rounded-none font-light antialiased opacity-80 transition-all duration-500 hover:decoration-inherit hover:opacity-100 sm:w-fit lg:decoration-transparent"
      >
        👤 you
      </Button>
    </form>
  );
}
export function SignOut(props: React.ComponentPropsWithRef<typeof Button>) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Button variant="destructiveGhost" className="rounded-none" {...props}>
        <LogOut strokeWidth={1} />
      </Button>
    </form>
  );
}
