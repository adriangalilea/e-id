"use server";

import { z } from "zod";

import { revalidateTag, unstable_cache } from "next/cache";

import { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";
import { eq, desc, isNotNull, and, not } from "drizzle-orm";
import { db } from "@/db";

import {
  SelectComment,
  SelectUser,
  users,
  comments,
  socials,
  SelectSocial,
  SocialPlatform,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { forbiddenUsernames } from "@/lib/const";

export async function getUsers(): Promise<SelectUser[]> {
  return await db.select().from(users);
}

export async function getLatestUsersWithUsername(): Promise<SelectUser[]> {
  return await db
    .select()
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(desc(users.created_at))
    .limit(6);
}

export const getLatestUsersWithUsernameCached = unstable_cache(
  async () => getLatestUsersWithUsername(),
  ["users"],
  { revalidate: 12 * 60 * 60 },
);

export async function getUser(id: SelectUser["id"]): Promise<SelectUser> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(
  username_normalized: SelectUser["username_normalized"],
): Promise<SelectUser> {
  if (!username_normalized) throw new Error("username is required");
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username_normalized, username_normalized))
    .limit(1);
  return result[0];
}

export const getUserByUsernameNormalizedCached = (
  username: SelectUser["username"],
) => {
  const username_normalized = username?.toLowerCase();
  console.log("username_normalized", username_normalized);
  return unstable_cache(
    () => getUserByUsername(username_normalized!),
    [`user-${username_normalized}`],
    { revalidate: 24 * 60 * 60 },
  )();
};

function applyDynamicFilter<T extends SQLiteSelectQueryBuilder>(
  qb: T,
  profileUserId: SelectUser["id"],
  visitorUserId: SelectUser["id"],
) {
  // If profileUserId is the same as visitorUserId, we fetch all comments made on the profile
  if (profileUserId === visitorUserId) {
    return qb.where(eq(comments.profile_user_id, profileUserId));
  } else {
    // If profileUserId and visitorUserId are different, fetch comments made by visitorUserId on profileUserId's profile
    return qb.where(
      and(
        eq(comments.profile_user_id, profileUserId),
        eq(comments.commentator_id, visitorUserId),
      ),
    );
  }
}

export async function fetchCommentsConditionally(
  profileUserId: SelectUser["id"],
  visitorUserId: SelectUser["id"],
) {
  let query = db
    .select({
      commentId: comments.id,
      commentBody: comments.body,
      commentCreatedAt: comments.created_at,
      commentPinned: comments.pinned,
      commentatorName: users.name,
      commentatorImage: users.image,
      commentatorUsername: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.commentator_id, users.id))
    .$dynamic();

  query = applyDynamicFilter(query, profileUserId, visitorUserId);

  const result = await query.all();

  return result.map((row) => ({
    commentId: row.commentId,
    body: row.commentBody,
    createdAt: row.commentCreatedAt,
    pinned: row.commentPinned,
    user: {
      name: row.commentatorName,
      image: row.commentatorImage,
      username: row.commentatorUsername,
    },
  }));
}

export async function getTestimonials(profileUserId: SelectUser["id"]) {
  // fetch all coments on a profile that are pinned true
  const result = await db
    .select({
      commentId: comments.id,
      commentBody: comments.body,
      commentCreatedAt: comments.created_at,
      commentatorName: users.name,
      commentatorImage: users.image,
      commentatorUsername: users.username,
    })
    .from(comments)
    .innerJoin(users, eq(comments.commentator_id, users.id))
    .where(
      and(
        eq(comments.profile_user_id, profileUserId),
        eq(comments.pinned, true),
      ),
    )
    .all();

  return result.map((row) => ({
    commentId: row.commentId,
    body: row.commentBody,
    createdAt: row.commentCreatedAt,
    user: {
      name: row.commentatorName,
      image: row.commentatorImage,
      username: row.commentatorUsername,
    },
  }));
}

export async function createComment(
  profile_user_id: SelectComment["profile_user_id"],
  commentator_id: SelectComment["commentator_id"],
  body: SelectComment["body"],
) {
  await db
    .insert(comments)
    .values({ id: crypto.randomUUID(), profile_user_id, commentator_id, body })
    .returning({ insertedId: comments.id });

  const user_profile = await getUser(profile_user_id);
  revalidatePath(`/${user_profile.username}`);
}

export async function createCommentFromForm(
  profileId: string,
  formData: FormData,
) {
  const body = String(formData.get("body"));
  const session = await auth();
  const commentatorId = session?.user?.id;
  if (!commentatorId) return;
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
  // TODO: check if the user is the owner of the comment or  the profile
  const session = await auth();
  if (!session?.user) return;

  const deleted_comment = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${deleted_comment[0].profile_user_id}`);
}

export async function pinCommentToggle(id: SelectComment["id"]) {
  // TODO: check if the user is the owner of the profile
  const session = await auth();
  if (!session?.user) return;

  const pinnedComment = await db
    .update(comments)
    .set({ pinned: not(comments.pinned) })
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${pinnedComment[0].profile_user_id}`);
}

export async function getSocials(
  userId: SelectUser["id"],
): Promise<SelectSocial[]> {
  return await db.select().from(socials).where(eq(socials.user_id, userId));
}

export const getValidUniqueSocialsCached = (userId: SelectUser["id"]) => {
  return unstable_cache(
    async () => {
      const allSocials = await getSocials(userId);
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
      return uniqueSocialsWithValue;
    },
    [`user-socials-${userId}`],
    {
      revalidate: 24 * 60 * 60,
    },
  )();
};

export async function updateUserAndSocials(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user || !session.user.id)
    return { message: "Session invalid.", error: true };
  const profileId = session.user.id;
  const name = String(formData.get("name"));
  const username = String(formData.get("username"));
  const bio = String(formData.get("bio"));
  const country_code = String(formData.get("country_code"));

  // update the user data first minus username for validation
  const updatedUser = await db
    .update(users)
    .set({ name, bio, country_code })
    .where(eq(users.id, profileId))
    .returning()
    .then((res) => res[0] ?? null);
  // update the username
  let setUsernameOutput = { message: "", error: false };
  if (username !== updatedUser.username) {
    setUsernameOutput = await setUsernameFromForm(
      { message: "", error: false },
      formData,
    );
  }

  // update the socials
  const socialEntries = new Map<
    string,
    {
      platform?: SocialPlatform;
      value?: string;
      public?: boolean;
      contextmessage?: string;
      highlight?: string;
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
      } else if (type === "highlight") {
        entry.highlight = value.toString();
      }
    }
  }

  for (let [key, content] of socialEntries) {
    if (content.platform) {
      await db
        .insert(socials)
        .values([
          {
            id: key,
            value: content.value || "",
            platform: content.platform,
            public: content.public ?? false,
            context_message:
              content.contextmessage === "" ? null : content.contextmessage,
            custom_data: content.highlight
              ? { highlight: content.highlight }
              : {},
          },
        ])
        .onConflictDoUpdate({
          target: socials.id,
          set: {
            value: content.value || "",
            public: content.public ?? false,
            context_message:
              content.contextmessage === "" ? null : content.contextmessage,
            custom_data: content.highlight
              ? { highlight: content.highlight }
              : {},
          },
        })
        .returning()
        .then((res) => res[0] ?? null);
    }
  }

  revalidatePath(`/${updatedUser.username}`);
  revalidatePath(`/${updatedUser.username}/edit`);
  revalidateTag(`user-socials-${updatedUser.username}`);
  return setUsernameOutput;
}

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { message: "Username cannot be empty." })
    .regex(/^[a-z0-9-_]+$/, {
      message:
        "Username must only contain lowercase letters, numbers, '-' and '_'.",
    })
    .refine((username: string) => !forbiddenUsernames.includes(username), {
      message: "Username is forbidden.",
    }),
});

export type FormState = {
  message: string;
  error: boolean;
};

export async function setUsernameFromForm(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const username = String(formData.get("username"));
    const validatedFields = schema.safeParse({
      username: formData.get("username"),
    });

    if (!validatedFields.success) {
      return {
        message:
          validatedFields.error.errors[0].message ?? "Invalid username.",
        error: true,
      };
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return {
        message: "You are not logged in.",
        error: true,
      };
    }

    await db
      .update(users)
      .set({
        username: username,
        username_normalized: username?.toLowerCase(),
      })
      .where(eq(users.id, userId))
      .returning({ updatedId: users.id });

    revalidatePath("/null");

    return {
      message: "Username updated.",
      error: false,
    };
  } catch (error) {
    return {
      message: "The username is taken",
      error: true,
    };
  }
}

export async function setUsername(
  user: SelectUser,
  username: SelectUser["username"],
) {
  const validatedFields = schema.safeParse({
    username: username,
  });
  if (!validatedFields.success) {
    throw new Error(validatedFields.error.errors[0].message);
  }
  await db
    .update(users)
    .set({
      username: username,
      username_normalized: username?.toLowerCase(),
    })
    .where(eq(users.id, user?.id));
}

export async function addSocial(
  userId: SelectUser["id"],
  platform: SocialPlatform,
) {
  try {
    await db
      .insert(socials)
      .values({ id: crypto.randomUUID(), user_id: userId, platform })
      .returning({ insertedId: socials.id });
    revalidatePath(`/${userId}/edit`);
    revalidatePath(`/${userId}`);
    revalidateTag(`user-socials-${userId}`);
  } catch (error) {
    console.error(error);
  }
}

export async function removeSocial(
  userId: SelectUser["id"],
  socialId: SelectSocial["id"],
) {
  try {
    await db
      .delete(socials)
      .where(eq(socials.id, socialId))
      .returning({ deletedId: socials.id });
    revalidatePath(`/${userId}/edit`);
    revalidatePath(`/${userId}`);
    revalidateTag(`user-socials-${userId}`);
  } catch (error) {
    console.error(error);
  }
}

export async function orderSocial(
  socialId: SelectSocial["id"],
  order: SelectSocial["order"],
) {
  console.log("orderSocial", socialId, order);
  try {
    const session = await auth();
    if (!session?.user?.id) return;
    const orderedSocial = await db
      .update(socials)
      .set({ order: order })
      .where(
        and(eq(socials.id, socialId), eq(socials.user_id, session?.user?.id)),
      )
      .returning()
      .then((res) => res[0] ?? null);

    console.log("orderedSocial", orderedSocial);
    revalidatePath(`/${orderedSocial.user_id}/edit`);
    revalidatePath(`/${orderedSocial.user_id}`);
  } catch (error) {
    console.error(error);
  }
}
