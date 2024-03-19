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
    <div className="flex flex-col gap-10">
      <UserProfile user={user} />
      <CommentSection profileUserId={user.id} visitorUserId={session?.user?.id} />
    </div>
  );
}
