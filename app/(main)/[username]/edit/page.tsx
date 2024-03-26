import { getUserByUsername } from "@/db/actions";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  const session = await auth();
  const user = await getUserByUsername(params.username);

  if (!user) redirect("/");

  if (session?.user?.username) {
    return (
      <div className="flex flex-1 flex-col justify-between">
        <UserProfile user={user} />
      </div>
    );
  }
  redirect(`/${params.username}`);
}
