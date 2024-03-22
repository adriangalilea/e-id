import { getUserByUsername } from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { auth } from "@/auth";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  const session = await auth();
  const user = await getUserByUsername(params.username);

  return (
    <div className="mx-auto flex h-fit max-h-dvh w-full max-w-2xl grow flex-col justify-between px-6 pt-3 md:pt-6">
      <UserProfile user={user} />
      <CommentSection
        profileUserId={user.id}
        visitorUserId={session?.user?.id}
      />
    </div>
  );
}
