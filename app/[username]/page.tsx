import {
  getUsers,
  getUserByUsername,
  getSocials,
  getTestimonials,
} from "@/db/actions";
import CommentSection from "./comment_section";
import UserProfile from "./user_profile";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pen } from "lucide-react";

import type { Metadata } from "next";
import { SocialPlatform } from "@/db/schema";
import { Testimonial } from "@/components/quote";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  // read route params
  const username = params.username;

  // fetch data
  const user = await getUserByUsername(username);

  if (!user) {
    notFound();
  }

  const allSocials = await getSocials(user.id);
  const uniqueSocialsWithValue = allSocials.reduce<SocialPlatform[]>(
    (uniquePlatforms, { value, platform }) => {
      if (value && !uniquePlatforms.includes(platform as SocialPlatform)) {
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
    description: `@${user.name} - Digital Identity`,
    openGraph: {
      title: user.name || "",
      description: `@${user.name} - Digital Identity`,
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
  const session = await auth();

  // TODO: perform this in middleware
  // check if user session has username if not redirect to /null if not already there
  if (session?.user && !session.user.username && params.username !== "null") {
    redirect("/null");
  }
  const user = await getUserByUsername(params.username);

  const testimonials = await getTestimonials(user.id);

  return (
    <div className="flex flex-1 flex-col justify-between gap-6 overflow-auto">
      <div className="flex flex-col gap-6">
        <UserProfile user={user} />
        {session && session.user?.username === user.username && (
          <Button asChild variant="secondary" size="icon">
            <Link href={`/${session.user.username}/edit`}>
              <Pen strokeWidth={1} className="opacity-60" />
            </Link>
          </Button>
        )}
        {testimonials.length > 0 && (
          <>
            <Separator />
            {testimonials.map((testimonial) => (
              <div key={testimonial.commentId}>
                <Testimonial
                  text={testimonial.body}
                  name={testimonial.user.name!}
                  image={testimonial.user.image!}
                  date={testimonial.createdAt}
                  username={testimonial.user.username!}
                />
              </div>
            ))}
          </>
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
