import {
  getUsers,
  getUserByUsernameNormalizedCached,
  getValidUniqueSocialsCached,
} from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const url = process.env.VERCEL_URL
    ? new URL(`https://${headers().get("host")}`)
    : new URL(`http://localhost:${process.env.PORT || 3000}`);
  // read route params
  const username = params.username;

  // fetch data
  const user = await getUserByUsernameNormalizedCached(username);

  if (!user) {
    notFound();
  }

  const socials = await getValidUniqueSocialsCached(user.id);

  const ogUrl = new URL(`${url}api/og`);
  ogUrl.searchParams.set("name", user.name || "");
  ogUrl.searchParams.set("socials", socials.join(","));
  // ogUrl.searchParams.set("image", user.image || "");

  console.log(ogUrl.toString());

  return {
    metadataBase: url,
    title: user.name,
    description: `@${user.username} - Digital Identity`,
    openGraph: {
      title: user.name || "",
      description: `@${user.username} - Digital Identity`,
      type: "profile",
      url: `https://e-id.to/${user.username}`,
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

  return users.map((user) => ({
    username: user.username,
  }));
}

export default async function Page({
  params,
}: {
  params: { username: string };
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-12">
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile username={params.username} />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <CommentSection username={params.username} />
      </Suspense>
    </div>
  );
}
