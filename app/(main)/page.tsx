import { getUsersWithUsername } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";
import { auth } from "@/auth";
import UsernameToast from "./username-toast";

export default async function Page() {
  const users = await getUsersWithUsername();
  const session = await auth();
  const username = session?.user?.username;
  let isUsernameNull = session ? username === null : false;
  return (
    <div className="flex-col">
      <LatestUsersTable users={users} />
      <UsernameToast isUsernameNull={isUsernameNull} />
    </div>
  );
}
