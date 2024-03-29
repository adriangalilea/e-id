import { getUsers, getUserByUsername } from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pen } from "lucide-react";

import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
  { params }: { params: { username: string } },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  // read route params
  const username = params.username;

  // fetch data
  const user = await getUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return {
    title: user.name,
  };
}

export async function generateStaticParams() {
  const users = await getUsers();

  return users.map((user) => ({
    username: user.username,
  }));
}

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
      <div className="flex flex-col gap-6">
        <UserProfile user={user} />
        {session && session.user?.username === user.username && (
          <Button asChild variant="secondary" className="!h-10 !w-full !p-0">
            <Link href={`/${session.user.username}/edit`}>
              <Pen strokeWidth={1} className="opacity-60" />
            </Link>
          </Button>
        )}
      </div>
      {session && (
        <CommentSection
          profileUserId={user.id}
          visitorUserId={session?.user?.id}
        />
      )}
    </div>
  );
}
