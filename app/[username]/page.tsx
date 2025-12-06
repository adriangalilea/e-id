import {
  getUsers,
  getUserByUsernameNormalizedCached,
  getValidUniqueSocialsCached,
} from "@/db/actions";
import { TestimonialsSection, CommentInteraction } from "./comment_section";
import UserProfile from "./user_profile";
import { notFound, redirect } from "next/navigation";

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

async function OwnerActions({ username }: { username: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.username !== username) {
    return <div className="h-10" />;
  }

  return (
    <div className="flex items-center justify-end gap-2 h-10">
      <ShareButton username={username} />
      <Button asChild variant="outline">
        <Link href={`/${username}?edit`} prefetch={false}>
          <Pen strokeWidth={1} />
          <span className="prose prose-zinc dark:prose-invert font-light">
            edit
          </span>
        </Link>
      </Button>
    </div>
  );
}

async function EditModeGuard({
  username,
  user,
}: {
  username: string;
  user: Awaited<ReturnType<typeof getUserByUsernameNormalizedCached>>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isOwner = session?.user?.username === user?.username;

  if (!isOwner) {
    redirect(`/${username}`);
  }

  return <UserProfile user={user!} edit={true} />;
}

async function PageContent({
  username,
  searchParams,
}: {
  username: string;
  searchParams: Promise<{ edit?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const isEditMode = resolvedSearchParams.edit !== undefined;

  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }

  if (isEditMode) {
    return (
      <Suspense fallback={<ProfileSkeleton />}>
        <EditModeGuard username={username} user={user} />
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={<ProfileSkeleton />}>
        <div className="animate-fade-in">
          <UserProfile user={user} />
        </div>
      </Suspense>

      <Suspense fallback={null}>
        <div className="animate-fade-in">
          <TestimonialsSection userId={user.id} />
        </div>
      </Suspense>

      <Suspense fallback={<div className="h-10" />}>
        <div className="animate-fade-in">
          <OwnerActions username={user.username!} />
        </div>
      </Suspense>

      <Suspense fallback={null}>
        <div className="animate-fade-in">
          <CommentInteraction profileUserId={user.id} />
        </div>
      </Suspense>
    </>
  );
}

export default async function Page(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await props.params;

  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-12">
      <Suspense fallback={<ProfileSkeleton />}>
        <PageContent
          username={params.username}
          searchParams={props.searchParams}
        />
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
      <div className="mt-6 flex flex-col gap-6 sm:mt-12">
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </main>
  );
}
