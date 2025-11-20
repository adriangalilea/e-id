import { getUserByUsernameNormalizedCached } from "@/db/actions";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { SocialComponent } from "@/components/social_component";
import { headers } from "next/headers";

export default async function Page(
  props: {
    params: Promise<{ username: string }>;
  }
) {
  const params = await props.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = await getUserByUsernameNormalizedCached(params.username);

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
  redirect(`/${params.username}`);
}
