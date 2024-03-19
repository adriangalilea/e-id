import { signIn, signOut } from "@/auth";
import { Button } from "./ui/button";
import { LogIn, LogOut } from "lucide-react";

export function SignIn({
  provider,
  ...props
}: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(provider);
      }}
    >
      <Button
        variant="ghost"
        className="rounded-none lg:decoration-transparent hover:decoration-inherit opacity-80 hover:opacity-100 transition-all duration-500 font-light antialiased"
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
        <LogOut strokeWidth={1} size={16} />
      </Button>
    </form>
  );
}
