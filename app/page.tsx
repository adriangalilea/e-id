import { getUsersWithUsername } from "@/db/actions";
import { LatestUsersTable } from "@/components/latest_users_table";

export default async function Page() {
  const users = await getUsersWithUsername();
  return (
    <div className="flex justify-between">
      <LatestUsersTable users={users} />
    </div>
  );
}
