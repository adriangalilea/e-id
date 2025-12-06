import { getUserByUsernameNormalizedCached } from "@/db/actions";
import UserProfile from "../user_profile";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";

export default async function EditPage(props: {
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;

  const user = await getUserByUsernameNormalizedCached(params.username);
  if (!user) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.username !== user.username) {
    redirect(`/${params.username}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <UserProfile user={user} edit={true} />
    </div>
  );
}
