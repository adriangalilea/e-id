import { getUsers, createRandomUser } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";
import AddForm from "./add_random_user";

export default async function Page() {
  const users = await getUsers();
  return (
    <div className="flex-col">
      <LatestUsersTable users={users} />
      <AddForm />
    </div>
  );
}
