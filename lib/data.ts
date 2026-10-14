import "server-only";

import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  comments,
  type LinkPlatform,
  links,
  type SelectLink,
  users,
} from "@/db/schema";
import { linkName } from "@/lib/link-names";
import { getLinkUrl } from "@/lib/links";
import { SHOWCASE_EXAMPLES, type ShowcaseCard } from "@/lib/showcase-examples";
import { USERS_TAG, profileTag, usernameTag } from "@/lib/tags";

// The reads public pages are prerendered from. Each is cached for good ("max")
// under the tags of lib/tags and expires only when a write expires its tag, so a
// page is rendered once per change, never per visit.

const profileColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  username_normalized: users.username_normalized,
  image: users.image,
  bio: users.bio,
  country_code: users.country_code,
  createdAt: users.createdAt,
};

export type Profile = {
  id: string;
  name: string | null;
  username: string;
  username_normalized: string;
  image: string | null;
  bio: string | null;
  country_code: string;
  createdAt: Date;
};

export async function getProfile(username: string): Promise<Profile | null> {
  "use cache";
  cacheLife("max");
  const normalized = username.toLowerCase();
  cacheTag(usernameTag(normalized));

  const [row] = await db
    .select(profileColumns)
    .from(users)
    .where(eq(users.username_normalized, normalized))
    .limit(1);
  if (!row) return null;
  cacheTag(profileTag(row.id));

  const { username: name, username_normalized } = row;
  if (!name || !username_normalized)
    throw new Error(`user ${row.id} matched ${normalized} without a username`);
  return { ...row, username: name, username_normalized };
}

/** Links in the order their owner gave them, unordered ones last. */
export function byLinkOrder(a: SelectLink, b: SelectLink) {
  return (a.order ?? Infinity) - (b.order ?? Infinity);
}

/** What a visitor sees: public links that carry a value, in order. */
export async function getPublicLinks(userId: string): Promise<SelectLink[]> {
  "use cache";
  cacheLife("max");
  cacheTag(profileTag(userId));

  const rows = await db
    .select()
    .from(links)
    .where(and(eq(links.user_id, userId), eq(links.public, true)));
  return rows.filter((link) => link.value).sort(byLinkOrder);
}

/** Every link of a user, private and empty ones included: the editor's. */
export async function getAllLinks(userId: string): Promise<SelectLink[]> {
  const rows = await db.select().from(links).where(eq(links.user_id, userId));
  return rows.sort(byLinkOrder);
}

export type Testimonial = {
  commentId: string;
  body: string;
  createdAt: Date;
  user: { name: string | null; image: string | null; username: string | null };
};

/** The comments a profile's owner pinned, shown to everyone. */
export async function getTestimonials(
  profileUserId: string,
): Promise<Testimonial[]> {
  "use cache";
  cacheLife("max");
  cacheTag(profileTag(profileUserId));

  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.created_at,
      commentatorId: comments.commentator_id,
      name: users.name,
      image: users.image,
      username: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.commentator_id, users.id))
    .where(
      and(
        eq(comments.profile_user_id, profileUserId),
        eq(comments.pinned, true),
      ),
    )
    .orderBy(asc(comments.created_at));

  for (const row of rows) cacheTag(profileTag(row.commentatorId));
  return rows.map((row) => ({
    commentId: row.commentId,
    body: row.body,
    createdAt: row.createdAt,
    user: { name: row.name, image: row.image, username: row.username },
  }));
}

export type ListedUser = {
  id: string;
  name: string | null;
  username: string;
  country_code: string;
  createdAt: Date;
};

const LATEST_USERS = 20;

/** The home's latest sign-ups: the newest users with a username, those who set a
 *  country first when there are more than fit. */
export async function getLatestUsers(): Promise<ListedUser[]> {
  "use cache";
  cacheLife("max");
  cacheTag(USERS_TAG);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      country_code: users.country_code,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(desc(users.createdAt))
    .limit(LATEST_USERS * 2.5);

  const listed = rows.map(({ username, ...row }) => {
    if (!username) throw new Error(`user ${row.id} listed without a username`);
    return { ...row, username };
  });
  if (listed.length <= LATEST_USERS) return listed;
  const withFlag = listed.filter((user) => user.country_code !== "XX");
  const withoutFlag = listed.filter((user) => user.country_code === "XX");
  return [...withFlag, ...withoutFlag].slice(0, LATEST_USERS);
}

/** A public link as the card shows it: its platform, its name and the address
 *  that opens it. Public links have a value (getPublicLinks keeps only those). */
export function cardLinkOf(link: SelectLink): {
  platform: LinkPlatform;
  name: string;
  url: string;
} {
  if (!link.value)
    throw new Error(`link ${link.id} is shown on a card with no value`);
  return {
    platform: link.platform,
    name: linkName(link.platform, link.label),
    url: getLinkUrl(link.platform, link.value),
  };
}

/** How many real cards the home's hero piles: the top one and eight under it,
 *  and one more for when the visitor's own is among them and left out
 *  (components/landing/hero-cards, `Pile`, `UNDER`). */
const SHOWCASE = 10;

/** Whose card leads the home's hero, when it exists: the maker's. */
const SHOWCASE_LEAD = "adriangalilea";

/** The people whose cards the home shows: the lead card first, then the latest
 *  with a whole card to show (a photo, a name and a country), newest first,
 *  and where too few have one yet, the pile filled with examples
 *  (lib/showcase-examples), never instead of a real card. Expires with the
 *  sign-ups list. */
export async function getShowcase(): Promise<ShowcaseCard[]> {
  "use cache";
  cacheLife("max");
  cacheTag(USERS_TAG);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      image: users.image,
      country_code: users.country_code,
      bio: users.bio,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.username),
        isNotNull(users.image),
        isNotNull(users.name),
        ne(users.country_code, "XX"),
      ),
    )
    .orderBy(
      desc(sql`${users.username_normalized} = ${SHOWCASE_LEAD}`),
      desc(users.createdAt),
    )
    .limit(SHOWCASE);

  const real = await Promise.all(
    rows.map(async ({ id, name, username, image, ...row }) => {
      if (!name || !username || !image)
        throw new Error(
          `showcase row for @${username} lacks what it was chosen for`,
        );
      const links = (await getPublicLinks(id)).map(cardLinkOf);
      return { ...row, name, username, image, links };
    }),
  );
  return [...real, ...SHOWCASE_EXAMPLES].slice(0, SHOWCASE);
}

/** Every username, the way it is shown: the profiles that exist. */
export async function getUsernames(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  cacheTag(USERS_TAG);

  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(asc(users.createdAt));
  return rows.map(({ username }) => {
    if (!username) throw new Error("isNotNull returned a null username");
    return username;
  });
}
