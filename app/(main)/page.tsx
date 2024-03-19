import { getUsersWithUsername } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";
import { auth } from "@/auth";
import UsernameToast from "./username-toast";

export default async function Page() {
  const users = await getUsersWithUsername();

  const username = await auth().then((session) => session?.user?.username);

  return (
    <div className="flex-col">
      <LatestUsersTable users={users} />
      {!username && <UsernameToast />}
    </div>
  );
}
