import { getUsers, createRandomUser } from "@/db/actions";
import { LatestUsersTable } from "./latest_users_table";

export default async function Page() {
  const users = await getUsers();
  return (
    <>
      <LatestUsersTable users={users} createRandomUser={createRandomUser} />
    </>
  );
}
