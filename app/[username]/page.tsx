import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Testimonial } from "@/components/quote";
import {
  getProfile,
  getPublicSocials,
  getTestimonials,
  getUsernames,
} from "@/lib/data";
import { getPresence } from "@/lib/presence";
import { CARD_TYPE } from "@/lib/card";
import { EMOJI_DOMAIN } from "@/lib/const";
import { inlineJson, profileJsonLd, profileUrl } from "@/lib/profile-ld";
import { CommentInteraction, HiddenFromOwner } from "./comment_section";
import { OwnerActions } from "./owner_actions";
import UserProfile from "./user_profile";
import { Wide } from "@/components/frame";
import { PROFILE } from "@/components/profile-layout";

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
  const title = user.name
    ? `${user.name} (@${user.username})`
    : `@${user.username}`;
  const description =
    user.bio ||
    (platforms.length > 0
      ? `@${user.username} on ${EMOJI_DOMAIN}: ${platforms.join(", ")}`
      : `@${user.username} on ${EMOJI_DOMAIN}`);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: profileUrl(user.username),
      // The card as data (lib/card), so a reader finds it from the page alone.
      // And the card as an embed, for an oEmbed reader (app/api/oembed).
      types: {
        [CARD_TYPE]: `/${user.username}/card.json`,
        "application/json+oembed": `/api/oembed?format=json&url=${encodeURIComponent(profileUrl(user.username))}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "profile",
      username: user.username,
      url: profileUrl(user.username),
    },
    // The image is the card (opengraph-image), shown large.
    twitter: { card: "summary_large_image", title, description },
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
  const presence = await getPresence(socials);

  return (
    // Framed as every profile is (components/profile-layout).
    <Wide className={PROFILE.frame}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: inlineJson(profileJsonLd(user, socials)),
        }}
      />
      <UserProfile
        user={user}
        socials={socials}
        presence={presence}
        actions={<OwnerActions username={user.username} />}
        vouches={
          <>
            {testimonials.length > 0 && (
              <HiddenFromOwner username={user.username}>
                <section
                  aria-labelledby="vouched"
                  className="flex animate-fade-in flex-col gap-3"
                >
                  <h2
                    id="vouched"
                    className="px-1 font-mono text-xs text-foreground/50"
                  >
                    vouched by {testimonials.length}
                  </h2>
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
                </section>
              </HiddenFromOwner>
            )}
            <CommentInteraction profileUserId={user.id} />
          </>
        }
      />
    </Wide>
  );
}
