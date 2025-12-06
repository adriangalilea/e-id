"use server";

import { z } from "zod";

import { updateTag, cacheTag, cacheLife, revalidatePath } from "next/cache";

import { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";
import { eq, desc, isNotNull, and, not, ne } from "drizzle-orm";
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
import { auth } from "@/auth";
import { forbiddenUsernames } from "@/lib/const";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getUsers(): Promise<SelectUser[]> {
  return await db.select().from(users);
}

export async function getLatestUsersWithUsername(): Promise<SelectUser[]> {
  // Fetch more than 20 to allow for filtering
  const result = await db
    .select()
    .from(users)
    .where(isNotNull(users.username))
    .orderBy(desc(users.createdAt))
    .limit(50);

  // If we have less than or equal to 20, return all
  if (result.length <= 20) {
    return result;
  }

  // We have more than 20, prioritize users with flags
  const withFlags = result.filter((u) => u.country_code !== "XX");
  const withoutFlags = result.filter((u) => u.country_code === "XX");

  // Take all users with flags first, then fill remaining spots with users without flags
  const filtered = [
    ...withFlags,
    ...withoutFlags.slice(0, Math.max(0, 20 - withFlags.length)),
  ];

  return filtered.slice(0, 20);
}

export async function getLatestUsersWithUsernameCached(): Promise<
  SelectUser[]
> {
  "use cache";
  cacheLife("minutes");
  cacheTag("users");
  return getLatestUsersWithUsername();
}

export async function getUser(id: SelectUser["id"]): Promise<SelectUser> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(
  username_normalized: SelectUser["username_normalized"],
): Promise<SelectUser | null> {
  // Change undefined to null
  try {
    if (!username_normalized) throw new Error("username is required");
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username_normalized, username_normalized))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(error);
    throw new Error("User not found");
  }
}

export async function getUserByUsernameNormalizedCached(
  username: string,
): Promise<SelectUser | null> {
  "use cache";
  cacheLife("hours");

  if (!username) throw new Error("Username cannot be empty");
  const username_normalized = username.toLowerCase();
  cacheTag("users", `user-${username_normalized}`);

  const user = await getUserByUsername(username_normalized);
  if (!user) {
    console.error("User not found");
  }
  return user;
}

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

  const mapped = result.map((row) => ({
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

  console.log("[fetchCommentsConditionally]", {
    count: mapped.length,
    sample: mapped[0]
      ? {
          createdAt: mapped[0].createdAt,
          createdAtType: typeof mapped[0].createdAt,
          isDate: mapped[0].createdAt instanceof Date,
        }
      : null,
  });

  return mapped;
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

  const mapped = result.map((row) => ({
    commentId: row.commentId,
    body: row.commentBody,
    createdAt: row.commentCreatedAt,
    user: {
      name: row.commentatorName,
      image: row.commentatorImage,
      username: row.commentatorUsername,
    },
  }));

  console.log("[getTestimonials]", {
    count: mapped.length,
    sample: mapped[0]
      ? {
          createdAt: mapped[0].createdAt,
          createdAtType: typeof mapped[0].createdAt,
          isDate: mapped[0].createdAt instanceof Date,
        }
      : null,
  });

  return mapped;
}

export async function getTestimonialsCached(profileUserId: SelectUser["id"]) {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-${profileUserId}`);
  return getTestimonials(profileUserId);
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
  updateTag(`user-${user_profile.id}`);
  revalidatePath(`/${user_profile.username}`);
}

export async function createCommentFromForm(
  prevState: { resetKey: string; error: string | null },
  formData: FormData,
  profileId: string,
) {
  const body = String(formData.get("body"));
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const commentatorId = session?.user?.id;
  if (!commentatorId) {
    return {
      ...prevState,
      error:
        "There was an error, try again later or report it to adriangalilea@gmail.com",
    };
  }

  if (!body) {
    return {
      ...prevState,
      error: "Comment can't be empty",
    };
  }
  await createComment(profileId, commentatorId, body);
  return {
    resetKey: Date.now().toString(),
    error: null,
  };
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
  const user_profile = await getUser(patched_comment[0].profile_user_id);
  updateTag(`user-${user_profile.id}`);
  revalidatePath(`/${user_profile.username}`);
}

export async function deleteComment(id: SelectComment["id"]): Promise<void> {
  // TODO: check if the user is the owner of the comment or  the profile
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return;

  const deleted_comment = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();
  const user_profile = await getUser(deleted_comment[0].profile_user_id);
  updateTag(`user-${user_profile.id}`);
  revalidatePath(`/${user_profile.username}`);
}

export async function pinCommentToggle(id: SelectComment["id"]) {
  // TODO: check if the user is the owner of the profile
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return;

  const pinnedComment = await db
    .update(comments)
    .set({ pinned: not(comments.pinned) })
    .where(eq(comments.id, id))
    .returning();
  const user_profile = await getUser(pinnedComment[0].profile_user_id);
  updateTag(`user-${user_profile.id}`);
  revalidatePath(`/${user_profile.username}`);
}

export async function getSocials(
  userId: SelectUser["id"],
): Promise<SelectSocial[]> {
  return await db.select().from(socials).where(eq(socials.user_id, userId));
}

export async function getSocialsCached(
  userId: SelectUser["id"],
): Promise<SelectSocial[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-${userId}`);
  return getSocials(userId);
}

export async function getValidUniqueSocialsCached(
  userId: SelectUser["id"],
): Promise<SocialPlatform[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-${userId}`);

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
}

export async function updateUserAndSocials(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
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

  updateTag("users");
  updateTag(`user-${updatedUser.id}`);
  revalidatePath(`/${updatedUser.username}`);

  if (setUsernameOutput.error) {
    return setUsernameOutput;
  }

  const finalUsername =
    username !== updatedUser.username ? username : updatedUser.username;
  redirect(`/${finalUsername}`);
}

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(5, { message: "Username must be at least 5 characters." })
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
        message: validatedFields.error.issues[0].message ?? "Invalid username.",
        error: true,
      };
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return {
        message: "You are not logged in.",
        error: true,
      };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .then((res) => res[0]);

    if (!user) {
      return {
        message: "User not found.",
        error: true,
      };
    }

    await setUsername(user, username);
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
    throw new Error(validatedFields.error.issues[0].message);
  }
  const validUsername = validatedFields.data.username;

  await db
    .update(users)
    .set({
      username: validUsername,
      username_normalized: validUsername.toLowerCase(),
    })
    .where(eq(users.id, user?.id));

  updateTag("users");
  updateTag(`user-${user.id}`);
  revalidatePath(`/${validUsername}`);
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
    const user = await getUser(userId);
    updateTag(`user-${userId}`);
    revalidatePath(`/${user.username}`);
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
    const user = await getUser(userId);
    updateTag(`user-${userId}`);
    revalidatePath(`/${user.username}`);
  } catch (error) {
    console.error(error);
  }
}

export async function orderSocial(
  socialId: SelectSocial["id"],
  order: SelectSocial["order"],
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) return;
    const orderedSocial = await db
      .update(socials)
      .set({ order: order })
      .where(
        and(eq(socials.id, socialId), eq(socials.user_id, session?.user?.id)),
      )
      .returning()
      .then((res) => res[0] ?? null);

    if (!orderedSocial || !orderedSocial.user_id) return;
    const user = await getUser(orderedSocial.user_id);
    updateTag(`user-${orderedSocial.user_id}`);
    revalidatePath(`/${user.username}`);
  } catch (error) {
    console.error(error);
  }
}
