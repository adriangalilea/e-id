import { getUserByUsername } from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  const user = await getUserByUsername(params.username);
  console.log(user);

  return (
    <div className="flex flex-col gap-10">
      <UserProfile user={user} />
      <CommentSection userId={user.id} />
    </div>
  );
}
