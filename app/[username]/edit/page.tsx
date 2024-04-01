import { getUserByUsernameCached } from "@/db/actions";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  const session = await auth();
  const user = await getUserByUsernameCached(params.username);

  if (!user) redirect("/");

  if (session?.user?.username) {
    return <UserProfile user={user} />;
  }
  redirect(`/${params.username}`);
}
