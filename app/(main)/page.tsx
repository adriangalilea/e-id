import { getUsers } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";
import UserButton from "@/components/user-button";

export default async function Page() {
  const users = await getUsers();
  return (
    <div className="flex-col">
      <LatestUsersTable users={users} />
    </div>
  );
}
