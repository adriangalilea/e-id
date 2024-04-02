import Flag from "@/components/flag";
import { SelectUser } from "@/db/schema";
import { SocialComponent } from "@/components/social_component";
import { Quote } from "@/components/quote";
import { getUserByUsernameNormalizedCached } from "@/db/actions";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pen } from "lucide-react";
import { notFound } from "next/navigation";

export default async function UserProfile({
  username,
}: {
  username: SelectUser["username"];
}) {
  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }
  const session = await auth();
  return (
    <main>
      <div>
        <div
          className="prose prose-zinc dark:prose-invert flex flex-col justify-between gap-1.5 pt-3
            sm:flex-row sm:items-end sm:gap-3"
        >
          <h1 className="!m-0 text-2xl font-light">{user.name}</h1>
          <div className="flex items-end justify-between sm:grow">
            <p className="prose prose-zinc dark:prose-invert !m-0 text-xl font-extralight">
              @{user.username}
            </p>
            <div className="flex content-between items-start gap-1.5">
              <Flag country={user.country_code} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6 sm:mt-12">
        {user.bio && (
          <div className="sm:mb-6">
            <Quote text={user.bio} />
          </div>
        )}
        <SocialComponent user={user} />
        {session && session.user?.username === user.username && (
          <div className="flex items-center justify-end gap-2">
          <Button asChild variant="secondary" size="icon" className="self-end">
            <Link href={`/${session.user.username}/edit`}>
              <Pen strokeWidth={1} className="opacity-60" />
            <Button asChild variant="outline">
              <Link href={`/${session.user.username}/edit`} prefetch={false}>
                <Pen strokeWidth={1} className="pr-2" />
                <span className="prose prose-zinc dark:prose-invert font-light">
                  edit
                </span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
