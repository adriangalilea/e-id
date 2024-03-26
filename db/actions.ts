"use server";

import { eq, desc, isNotNull } from "drizzle-orm";
import { db } from "@/db";

import {
  SelectComment,
  SelectUser,
  users,
  comments,
  socials,
  SelectSocial,
  socialPlatforms,
  SocialPlatform,
} from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function getUsers(): Promise<SelectUser[]> {
  return await db.select().from(users).orderBy(desc(users.id)).limit(6);
}

export async function getUsersWithUsername(): Promise<SelectUser[]> {
  return await db
    .select()
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(desc(users.id))
    .limit(6);
}

export async function getUser(id: SelectUser["id"]): Promise<SelectUser> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(
  username: SelectUser["username"],
): Promise<SelectUser> {
  if (!username) throw new Error("username is required");
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export async function getAllCommentsAndCommentatorsFromProfile(
  id: SelectUser["id"],
): Promise<Array<{ users: SelectUser; comments: SelectComment | null }>> {
  return await db
    .select({ users: users, comments: comments })
    .from(users)
    .innerJoin(comments, eq(users.id, comments.profile_user_id));
}

export async function createComment(
  profile_user_id: SelectComment["profile_user_id"],
  commentator_id: SelectComment["commentator_id"],
  body: SelectComment["body"],
) {
  console.log({ profile_user_id, commentator_id, body });
  await db
    .insert(comments)
    .values({ profile_user_id, commentator_id, body })
    .returning({ insertedId: comments.id });

  const user_profile = await getUser(profile_user_id);
  revalidatePath(`/${user_profile.username}`);
}

export async function createCommentFromForm(
  profileId: string,
  commentatorId: string,
  formData: FormData,
) {
  const body = String(formData.get("body"));
  // TODO: should be done with zod
  if (!body) return;
  await createComment(profileId, commentatorId, body);
}

export async function patchComment(
  id: SelectComment["id"],
  body: SelectComment["body"],
) {
  const patched_comment = await db
    .update(comments)
    .set({ body })
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${patched_comment[0].profile_user_id}`);
}

export async function deleteComment(id: SelectComment["id"]): Promise<void> {
  const deleted_comment = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${deleted_comment[0].profile_user_id}`);
}

export async function getSocials(
  userId: SelectUser["id"],
): Promise<SelectSocial[]> {
  return await db.select().from(socials).where(eq(socials.user_id, userId));
}

export async function updateUserAndSocials(
  profileId: string,
  formData: FormData,
) {
  console.log(profileId, formData);
  const name = String(formData.get("name"));
  const username = String(formData.get("username"));
  const bio = String(formData.get("bio"));
  const country_code = String(formData.get("country_code"));

  // update the user data first
  const updatedUser = await db
    .update(users)
    .set({ name, username, bio, country_code })
    .where(eq(users.id, profileId))
    .returning()
    .then((res) => res[0] ?? null);
  console.log(updatedUser);

  // update the socials
  const socialEntries = new Map<
    string,
    {
      platform?: SocialPlatform;
      value?: string;
      public?: boolean;
      contextmessage?: string;
    }
  >();
  // Aggregate formData into socialEntries
  for (let [key, value] of formData.entries()) {
    const elements = key.split("_");
    const platform = elements[0] as SocialPlatform;
    const socialId = elements[1];
    const type = elements[2];

    if (!platform || !socialId || !type) continue;

    if (!socialEntries.has(socialId)) {
      socialEntries.set(socialId, { platform });
    }

    const entry = socialEntries.get(socialId);
    if (entry) {
      if (type === "value") {
        entry.value = value.toString();
      } else if (type === "public") {
        entry.public = Boolean(value);
      } else if (type === "contextmessage") {
        entry.contextmessage = value.toString();
      }
    }
  }

  for (let [key, content] of socialEntries) {
    // Ensure content.platform is defined to satisfy db insertion requirements
    if (content.platform) {
      const insertedSocial = await db
        .insert(socials)
        .values([
          {
            id: key,
            value: content.value || "",
            platform: content.platform,
            public: content.public ?? false,
            context_message: content.contextmessage,
          },
        ])
        .onConflictDoUpdate({
          target: socials.id,
          set: {
            value: content.value || "",
            public: content.public ?? false,
            context_message: content.contextmessage,
          },
        })
        .returning()
        .then((res) => res[0] ?? null);

      console.log({ insertedSocial });
    }
  }

  revalidatePath(`/${updatedUser.username}`);
}
