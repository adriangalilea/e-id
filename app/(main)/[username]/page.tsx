import { getUserByUsername } from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  const session = await auth();

  // TODO: perform this in middleware
  // check if user session has username if not redirect to /null if not already there
  if (session?.user && !session.user.username && params.username !== "null") {
    redirect("/null");
  }
  const user = await getUserByUsername(params.username);

  return (
    <div className="flex flex-1 flex-col justify-between">
      <UserProfile user={user} />
      <CommentSection
        profileUserId={user.id}
        visitorUserId={session?.user?.id}
      />
    </div>
  );
}
