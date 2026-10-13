import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { forbiddenUsernames } from "@/lib/const";

export const usernameSchema = z
  .string()
  .trim()
  .min(5, { message: "Username must be at least 5 characters." })
  .regex(/^[a-z0-9-_]+$/, {
    message:
      "Username must only contain lowercase letters, numbers, '-' and '_'.",
  })
  .refine((username: string) => !forbiddenUsernames.includes(username), {
    message: "Username is forbidden.",
  });

/** Gives a user a username. Throws the validation message for an invalid one and
 *  the database's unique-constraint error for a taken one. The caller expires the
 *  caches (lib/tags): an action with updateTag, a route handler with
 *  revalidateTag. */
export async function claimUsername(
  userId: string,
  username: string,
): Promise<string> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const valid = parsed.data;

  const updated = await db
    .update(users)
    .set({ username: valid, username_normalized: valid.toLowerCase() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length !== 1)
    throw new Error(`claimUsername: no user ${userId}`);
  return valid;
}
