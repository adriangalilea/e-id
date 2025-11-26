import {
  getUsers,
  getUserByUsernameNormalizedCached,
  getValidUniqueSocialsCached,
} from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { notFound, redirect } from "next/navigation";

import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { getBaseUrlFromHeaders } from "@/lib/url";
import { PROD_URL } from "@/lib/const";
import { auth } from "@/auth";

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const url = new URL(getBaseUrlFromHeaders(await headers()));
  const username = params.username;
  if (!username) {
    notFound();
  }

  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }

  const socials = await getValidUniqueSocialsCached(user.id);

  const ogUrl = new URL(`${url}api/og`);
  ogUrl.searchParams.set("name", user.name || "");
  ogUrl.searchParams.set("socials", socials.join(","));

  return {
    metadataBase: url,
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

async function UserProfileWithAuth({
  username,
  searchParams,
}: {
  username: string;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await getUserByUsernameNormalizedCached(username);
  if (!user) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const isEditMode = resolvedSearchParams.edit !== undefined;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isOwner = session?.user?.username === user.username;

  if (isEditMode && !isOwner) {
    redirect(`/${username}`);
  }

  return (
    <UserProfile
      user={user}
      edit={isEditMode && isOwner}
      isOwner={isOwner}
    />
  );
}

async function CommentSectionWithParams({
  username,
  searchParams,
}: {
  username: string;
  searchParams: Promise<{ edit?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const isEditMode = resolvedSearchParams.edit !== undefined;

  if (isEditMode) {
    return null;
  }

  return <CommentSection username={username} />;
}

export default async function Page(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await props.params;

  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-12">
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfileWithAuth
          username={params.username}
          searchParams={props.searchParams}
        />
      </Suspense>

      <Suspense fallback={<div className="animate-pulse h-20" />}>
        <CommentSectionWithParams
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
        <div className="flex flex-col justify-between gap-1.5 pt-3 sm:flex-row sm:items-end sm:gap-3">
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
