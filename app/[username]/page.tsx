import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { Wide } from "@/components/frame"
import { PROFILE } from "@/components/profile-layout"
import { Testimonial } from "@/components/quote"
import { getMade } from "@/lib/activity"
import { CARD_TYPE } from "@/lib/card"
import { EMOJI_DOMAIN } from "@/lib/const"
import {
  getProfile,
  getPublicLinks,
  getTestimonials,
  getUsernames,
  renamedTo,
} from "@/lib/data"
import { getPresence } from "@/lib/presence"
import { inlineJson, profileJsonLd, profileUrl } from "@/lib/profile-ld"
import { VCARD_TYPE } from "@/lib/vcard"
import { CommentInteraction, HiddenFromOwner } from "./comment_section"
import { OwnerActions } from "./owner_actions"
import UserProfile from "./user_profile"

// A profile is a static page: prerendered for every username at build, rendered
// once on its first visit for a username that came later, and rendered again
// only when a write expires one of its tags (lib/tags). Everything that depends
// on who is looking is a client island that reads the display cookie (lib/chip),
// so a visit runs no server function.

/** A name that found nobody: the page of whoever it is an alias of (lib/renamed),
 *  permanently, else the 404. */
async function absent(username: string): Promise<never> {
  const to = await renamedTo(username)
  if (to) permanentRedirect(`/${to}`)
  notFound()
}

export async function generateStaticParams() {
  const usernames = await getUsernames()
  if (usernames.length === 0)
    throw new Error("no usernames to prerender: is DB_URL the right database?")
  return usernames.map((username) => ({ username }))
}

export async function generateMetadata(props: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await props.params
  const user = await getProfile(username)
  if (!user) return absent(username)

  const links = await getPublicLinks(user.id)
  // Each link as the profile's tabs name it: a platform by its id, a link of
  // their own by its label.
  const named = [...new Set(links.map((link) => link.label ?? link.platform))]
  const title = user.name
    ? `${user.name} (@${user.username})`
    : `@${user.username}`
  const description =
    user.bio ||
    (named.length > 0
      ? `@${user.username} on ${EMOJI_DOMAIN}: ${named.join(", ")}`
      : `@${user.username} on ${EMOJI_DOMAIN}`)

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: profileUrl(user.username),
      // The card as data (lib/card), so a reader finds it from the page alone;
      // as a contact (lib/vcard); and as an embed, for an oEmbed reader
      // (app/api/oembed).
      types: {
        [CARD_TYPE]: `/${user.username}/card.json`,
        [VCARD_TYPE]: `/${user.username}.vcf`,
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
  }
}

export default async function Page(props: {
  params: Promise<{ username: string }>
}) {
  const { username } = await props.params
  const user = await getProfile(username)
  if (!user) return absent(username)

  const [links, testimonials] = await Promise.all([
    getPublicLinks(user.id),
    getTestimonials(user.id),
  ])
  const [presence, made] = await Promise.all([
    getPresence(links),
    getMade(links),
  ])

  return (
    // Framed as every profile is (components/profile-layout).
    <Wide className={PROFILE.frame}>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the profile's JSON-LD, escaped for a script by `inlineJson` (lib/profile-ld), as Next's docs set it
        dangerouslySetInnerHTML={{
          __html: inlineJson(profileJsonLd(user, links)),
        }}
      />
      <UserProfile
        user={user}
        links={links}
        presence={presence}
        made={made}
        actions={
          <OwnerActions
            holder={{
              username: user.username,
              name: user.name,
              image: user.image,
              x: links.find((l) => l.platform === "twitter")?.value ?? null,
            }}
          />
        }
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
                    className="px-1 font-mono text-foreground/50 text-xs"
                  >
                    vouched by {testimonials.length}
                  </h2>
                  {testimonials.map((testimonial) => (
                    <Testimonial
                      key={testimonial.commentId}
                      text={testimonial.body}
                      writer={testimonial.user}
                      date={testimonial.createdAt}
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
  )
}
