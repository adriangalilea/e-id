import { getUsers, getSocials, getUserByUsernameCached } from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { SocialPlatform } from "@/db/schema";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  // read route params
  const username = params.username;

  // fetch data
  const user = await getUserByUsernameCached(username);

  if (!user) {
    notFound();
  }

  const allSocials = await getSocials(user.id);
  const uniqueSocialsWithValue = allSocials.reduce<SocialPlatform[]>(
    (uniquePlatforms, { value, platform, public: isPublic }) => {
      if (
        value &&
        isPublic &&
        !uniquePlatforms.includes(platform as SocialPlatform)
      ) {
        uniquePlatforms.push(platform as SocialPlatform);
      }
      return uniquePlatforms;
    },
    [],
  );

  const ogUrl = new URL(`${process.env.URL}/api/og`);
  ogUrl.searchParams.set("name", user.name || "");
  ogUrl.searchParams.set("socials", uniqueSocialsWithValue.join(","));
  // ogUrl.searchParams.set("image", user.image || "");

  console.log(ogUrl.toString());

  return {
    metadataBase: new URL(`${process.env.URL}`),
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
    <div className="flex flex-1 flex-col gap-6 overflow-auto sm:gap-12">
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile username={params.username} />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <CommentSection username={params.username} />
      </Suspense>
    </div>
  );
}
