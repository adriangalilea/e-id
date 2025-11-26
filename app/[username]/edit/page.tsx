import { getUserByUsernameNormalizedCached, getUsers } from "@/db/actions";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { SocialComponent } from "@/components/social_component";
import { headers } from "next/headers";
import { Suspense } from "react";

export async function generateStaticParams() {
  const users = await getUsers();
  return users
    .filter((user) => user.username !== null)
    .map((user) => ({
      username: user.username,
    }));
}

async function EditPageContent({ username }: { username: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = await getUserByUsernameNormalizedCached(username);

  if (!user) {
    console.log("User not found inside of page");
    notFound();
  }

  if (session?.user?.username) {
    return (
      <>
        <UserProfile user={user}>
          <SocialComponent user={user} edit={true} />
        </UserProfile>
        <div className="flex-1" />
      </>
    );
  }
  redirect(`/${username}`);
}

export default async function Page(
  props: {
    params: Promise<{ username: string }>;
  }
) {
  const params = await props.params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditPageContent username={params.username} />
    </Suspense>
  );
}
