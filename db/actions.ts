"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";

import { SelectComment, SelectUser, users, comments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faker } from "@faker-js/faker";

export async function createUser(
  name: SelectUser["name"],
  username: SelectUser["username"],
  bio: SelectUser["bio"],
  country_code: SelectUser["country_code"]
): Promise<SelectUser> {
  let created_user = await db
    .insert(users)
    .values({
      name: name,
      username: username,
      bio: bio,
      country_code: country_code,
    })
    .onConflictDoNothing()
    .returning();
  return created_user[0];
}

type FormState = {
  message: string;
};

export async function createRandomUser(prevState: FormState, data: FormData) {
  await createUser(
    faker.person.fullName(),
    faker.internet.userName(),
    faker.lorem.sentence(),
    faker.location.countryCode()
  );
  revalidatePath("/");
  return {
    message: "Form data processed",
  };
}

export async function getUsers(): Promise<SelectUser[]> {
  return await db.select().from(users).orderBy(desc(users.id)).limit(6);
}

export async function getUser(id: SelectUser["id"]): Promise<SelectUser> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByUsername(
  username: SelectUser["username"]
): Promise<SelectUser> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export async function getAllCommentsAndCommentatorsFromProfile(
  id: SelectUser["id"]
): Promise<Array<{ users: SelectUser; comments: SelectComment | null }>> {
  return await db
    .select({ users: users, comments: comments })
    .from(users)
    .innerJoin(comments, eq(users.id, comments.profile_id));
}

export async function createComment(
  profile_id: SelectComment["profile_id"],
  commentator_id: SelectComment["commentator_id"],
  body: SelectComment["body"]
) {
  console.log({ profile_id, commentator_id, body });
  await db
    .insert(comments)
    .values({ profile_id, commentator_id, body })
    .returning({ insertedId: comments.id });
  revalidatePath(`/${profile_id}`);
}

export async function createCommentFromForm(
  profileId: number,
  commentatorId: number,
  formData: FormData
) {
  const body = String(formData.get("body"));
  await createComment(profileId, commentatorId, body);
}

export async function patchComment(
  id: SelectComment["id"],
  body: SelectComment["body"]
) {
  const patched_comment = await db
    .update(comments)
    .set({ body })
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${patched_comment[0].profile_id}`);
}

export async function deleteComment(id: SelectComment["id"]): Promise<void> {
  const deleted_comment = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning();
  revalidatePath(`/${deleted_comment[0].profile_id}`);
}
