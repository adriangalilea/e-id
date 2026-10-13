import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Testimonial } from "@/components/quote";
import {
  getProfile,
  getPublicSocials,
  getTestimonials,
  getUsernames,
} from "@/lib/data";
import { getContributions } from "@/lib/github";
import { PROD_URL } from "@/lib/const";
import { inlineJson, profileJsonLd, profileUrl } from "@/lib/profile-ld";
import { CommentInteraction, HiddenFromOwner } from "./comment_section";
import { OwnerActions } from "./owner_actions";
import UserProfile from "./user_profile";

// A profile is a static page: prerendered for every username at build, rendered
// once on its first visit for a username that came later, and rendered again
// only when a write expires one of its tags (lib/tags). Everything that depends
// on who is looking is a client island that reads the display cookie (lib/chip),
// so a visit runs no server function.

export async function generateStaticParams() {
  const usernames = await getUsernames();
  if (usernames.length === 0)
    throw new Error("no usernames to prerender: is DB_URL the right database?");
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await props.params;
  const user = await getProfile(username);
  if (!user) notFound();

  const socials = await getPublicSocials(user.id);
  const platforms = [...new Set(socials.map((social) => social.platform))];
  const ogUrl = new URL(`${PROD_URL}/api/og`);
  ogUrl.searchParams.set("name", user.name || "");
  ogUrl.searchParams.set("socials", platforms.join(","));

  return {
    title: user.name,
    description: `@${user.username} - Digital Identity`,
    alternates: { canonical: profileUrl(user.username) },
    openGraph: {
      title: user.name || "",
      description: `@${user.username} - Digital Identity`,
      type: "profile",
      username: user.username,
      url: profileUrl(user.username),
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

export default async function Page(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;
  const user = await getProfile(username);
  if (!user) notFound();

  const [socials, testimonials] = await Promise.all([
    getPublicSocials(user.id),
    getTestimonials(user.id),
  ]);
  const github = socials.find((social) => social.platform === "github");
  const githubData = github?.value ? await getContributions(github.value) : [];

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: inlineJson(profileJsonLd(user, socials)),
        }}
      />
      <UserProfile user={user} socials={socials} githubData={githubData} />
      <OwnerActions username={user.username} />
      {testimonials.length > 0 && (
        <HiddenFromOwner username={user.username}>
          <div className="flex flex-col gap-2 animate-fade-in">
            {testimonials.map((testimonial) => (
              <Testimonial
                key={testimonial.commentId}
                text={testimonial.body}
                name={testimonial.user.name ?? ""}
                image={testimonial.user.image ?? ""}
                date={testimonial.createdAt}
                username={testimonial.user.username ?? ""}
              />
            ))}
          </div>
        </HiddenFromOwner>
      )}
      <CommentInteraction profileUserId={user.id} />
    </div>
  );
}
