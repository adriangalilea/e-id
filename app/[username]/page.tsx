import {
  getUsers,
  getUserByUsernameNormalizedCached,
  getValidUniqueSocialsCached,
  getSocialsCached,
} from "@/db/actions";
import {
  fetchGithubActivity,
  flattenData,
} from "@/components/social_component/fetch_github_activity";
import { TestimonialsSection, CommentInteraction } from "./comment_section";
import UserProfile from "./user_profile";
import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { PROD_URL } from "@/lib/const";
import { auth } from "@/auth";
import ShareButton from "./share_button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pen } from "lucide-react";

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const username = params.username;
  if (!username) {
    notFound();
  }

  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }

  const socials = await getValidUniqueSocialsCached(user.id);

  const ogUrl = new URL(`${PROD_URL}/api/og`);
  ogUrl.searchParams.set("name", user.name || "");
  ogUrl.searchParams.set("socials", socials.join(","));

  return {
    metadataBase: new URL(PROD_URL),
    title: user.name,
    description: `@${user.username} - Digital Identity`,
    openGraph: {
      title: user.name || "",
      description: `@${user.username} - Digital Identity`,
      type: "profile",
      url: `${PROD_URL}/${user.username}`,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: `@${user.name} - Digital Identity`,
        },
      ],
    },
  };
}

export async function generateStaticParams() {
  const users = await getUsers();

  return users
    .filter((user) => user.username !== null)
    .map((user) => ({
      username: user.username,
    }));
}

// Dynamic - requires headers() for auth check
async function OwnerActions({ username }: { username: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.username !== username) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 animate-fade-in">
      <ShareButton username={username} />
      <Button asChild variant="outline">
        <Link href={`/${username}/edit`} prefetch={false}>
          <Pen strokeWidth={1} />
          <span className="prose prose-zinc dark:prose-invert font-light">
            edit
          </span>
        </Link>
      </Button>
    </div>
  );
}

// Static - cached profile content
async function StaticProfile({ username }: { username: string }) {
  "use cache";

  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }

  const socials = await getSocialsCached(user.id);
  const githubSocial = socials.find((s) => s.platform === "github" && s.value);
  let githubData: { date: string; count: number; level: number }[] = [];
  if (githubSocial?.value) {
    const raw = await fetchGithubActivity(githubSocial.value);
    githubData = flattenData(raw);
  }

  return <UserProfile user={user} githubData={githubData} />;
}

// Dynamic sections wrapper
async function DynamicSections({ username }: { username: string }) {
  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) return null;

  return (
    <>
      <Suspense fallback={null}>
        <OwnerActions username={user.username!} />
      </Suspense>

      <Suspense fallback={null}>
        <TestimonialsSection userId={user.id} />
      </Suspense>

      <Suspense fallback={null}>
        <CommentInteraction profileUserId={user.id} />
      </Suspense>
    </>
  );
}

export default async function Page(props: {
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* Static profile - cached with "use cache" */}
      <StaticProfile username={params.username} />

      {/* Dynamic sections - each in own Suspense */}
      <Suspense fallback={null}>
        <DynamicSections username={params.username} />
      </Suspense>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <main className="animate-pulse">
      <div>
        <div
          className="flex flex-col justify-between gap-1.5 pt-3 sm:flex-row
            sm:items-end sm:gap-3"
        >
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex items-end justify-between sm:grow">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-6 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4">
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </main>
  );
}
