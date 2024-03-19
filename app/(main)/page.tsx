import { getUsersWithUsername } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";
import { auth } from "@/auth";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

export default async function Page() {
  const users = await getUsersWithUsername();
  const { toast } = useToast();
  const session = await auth();
  if (!session?.user?.username) {
    toast({
      variant: "destructive",
      title: "Uh oh! Username taken.",
      description: "Someone already had your auth privder username.",
      action: <ToastAction altText="Set username">Set username</ToastAction>,
    });
  }
  return (
    <div className="flex-col">
      <LatestUsersTable users={users} />
    </div>
  );
}
