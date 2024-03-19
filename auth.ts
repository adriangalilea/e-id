import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { type AdapterUser, Adapter } from "@auth/core/adapters";
import { users, accounts, verificationTokens, sessions, SelectUser } from "@/db/schema";
import { eq, and } from "drizzle-orm";

declare module "next-auth" {
  interface Profile extends Partial<SelectUser> {}
  interface User extends Partial<SelectUser> {}
}

function customAdapter(): Adapter {
  const adapter = DrizzleAdapter(db);

  // Overwrite createUser method on adapter
  adapter.createUser = async (data): Promise<AdapterUser> => {
    const dataEntered = await db
      .insert(users)
      .values({
        ...data,
        // @ts-ignore
        id: crypto.randomUUID(),
        gh_id: data.gh_id,
        gh_username: data.gh_username,
        gh_image: data.gh_image,
      })
      .returning()
      .then((res) => res[0] ?? null);

    if (!dataEntered) {
      throw new Error("User Creation Failed");
    }
    try {
      await db
        .update(users)
        .set({ username: dataEntered.gh_username })
        .where(eq(users.id, dataEntered.id));
    } catch (error) {
      console.error("Error updating user:", error);
    }

    return dataEntered;
  };

  // the rest of the methods need to be copy-pasted, else the custom session data will not appear
  adapter.getUser = async (data) => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, data))
      .get();
    return result ?? null;
  };
  adapter.getUserByEmail = async (data) => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, data))
      .get();
    return result ?? null;
  };
  adapter.createSession = (data) => {
    return db.insert(sessions).values(data).returning().get();
  };
  adapter.getSessionAndUser = async (data) => {
    const result = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .where(eq(sessions.sessionToken, data))
      .innerJoin(users, eq(users.id, sessions.userId))
      .get();
    return result ?? null;
  };

  adapter.updateUser = async (data) => {
    if (!data.id) {
      throw new Error("No user id.");
    }

    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, data.id))
      .returning()
      .get();
    return result ?? null;
  };

  adapter.updateSession = async (data) => {
    const result = await db
      .update(sessions)
      .set(data)
      .where(eq(sessions.sessionToken, data.sessionToken))
      .returning()
      .get();
    return result ?? null;
  };

  adapter.getUserByAccount = async (account) => {
    const results = await db
      .select()
      .from(accounts)
      .leftJoin(users, eq(users.id, accounts.userId))
      .where(
        and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId)
        )
      )
      .get();

    if (!results) {
      return null;
    }
    return Promise.resolve(results).then((results) => results.user);
  };

  adapter.deleteSession = async (sessionToken) => {
    const result = await db
      .delete(sessions)
      .where(eq(sessions.sessionToken, sessionToken))
      .returning()
      .get();
    return result ?? null;
  };

  adapter.createVerificationToken = async (token) => {
    const result = await db
      .insert(verificationTokens)
      .values(token)
      .returning()
      .get();
    return result ?? null;
  };

  adapter.useVerificationToken = async (token) => {
    try {
      const result = await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, token.identifier),
            eq(verificationTokens.token, token.token)
          )
        )
        .returning()
        .get();
      return result ?? null;
    } catch (err) {
      throw new Error("No verification token found.");
    }
  };

  adapter.deleteUser = async (id) => {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning()
      .get();
    return result ?? null;
  };

  adapter.unlinkAccount = async (account) => {
    await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.providerAccountId, account.providerAccountId),
          eq(accounts.provider, account.provider)
        )
      )
      .run();
  };

  return {
    ...adapter,
  };
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  basePath: "/auth",
  adapter: customAdapter(),
  providers: [
    GitHub({
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id.toString(),
          gh_id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          gh_image: profile.avatar_url,
          gh_username: profile.login,
        };
      },
    }),
  ],
});
