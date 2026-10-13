import "server-only";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { comments, socials, users, type SelectSocial } from "@/db/schema";
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

/** Socials in the order their owner gave them, unordered ones last. */
export function bySocialOrder(a: SelectSocial, b: SelectSocial) {
  return (a.order ?? Infinity) - (b.order ?? Infinity);
}

/** What a visitor sees: public socials that carry a value, in order. */
export async function getPublicSocials(
  userId: string,
): Promise<SelectSocial[]> {
  "use cache";
  cacheLife("max");
  cacheTag(profileTag(userId));

  const rows = await db
    .select()
    .from(socials)
    .where(and(eq(socials.user_id, userId), eq(socials.public, true)));
  return rows.filter((social) => social.value).sort(bySocialOrder);
}

/** Every social of a user, private and empty ones included: the edit form's. */
export async function getAllSocials(userId: string): Promise<SelectSocial[]> {
  const rows = await db
    .select()
    .from(socials)
    .where(eq(socials.user_id, userId));
  return rows.sort(bySocialOrder);
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
