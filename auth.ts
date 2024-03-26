import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { type AdapterUser, Adapter } from "@auth/core/adapters";
import {
  users,
  accounts,
  verificationTokens,
  sessions,
  SelectUser,
  socials,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

declare module "next-auth" {
  interface Profile extends Partial<SelectUser> {}
  interface User extends Partial<SelectUser> {}
}

function customAdapter(): Adapter {
  const adapter = DrizzleAdapter(db);

  // Overwrite createUser method on adapter
  adapter.createUser = async (data): Promise<AdapterUser> => {
    // TODO: create a non allowed usernames - ninja

    // Google returns this format
    // {
    //   id: '279f3a0b-5aa1-4eab-b72a-f0ff4c4b67c2',
    //   name: 'Adrian Galilea Delgado',
    //   email: 'adriangalilea@gmail.com',
    //   image: 'https://lh3.googleusercontent.com/a/ACg8ocKYnnkCAxRw6qspAIG425xBn9AiGvXW_El-vSVDv15tAic=s96-c',
    //   emailVerified: null
    // }

    // Github returns
    // gh_id gh_username gh_image

    console.log(data);
    const userCreated = await db
      .insert(users)
      .values({
        ...data,
        id: crypto.randomUUID(),
      })
      .returning()
      .then((res) => res[0] ?? null);

    if (!userCreated) {
      throw new Error("User Creation Failed");
    }

    // @ts-ignore
    if (data.gh_id) {
      try {
        const socialCreated = await db
          .insert(socials)
          .values({
            id: crypto.randomUUID(),
            user_id: userCreated.id,
            platform: "github",
            // @ts-ignore
            value: data.gh_username,
            // @ts-ignore
            image: data.gh_image,
            // @ts-ignore
            custom_data: { platform_user_id: data.gh_id },
          })
          .returning()
          .then((res) => res[0] ?? null);

        // create his email social
        await db
          .insert(socials)
          .values({
            id: crypto.randomUUID(),
            user_id: userCreated.id,
            platform: "email",
            value: data.email,
          })
          .returning()
          .then((res) => res[0] ?? null);

        // we try to set his image
        await db
          .update(users)
          // @ts-ignore
          .set({ image: data.gh_image })
          .where(eq(users.id, userCreated.id));

        // last we try to claim his username given his gh_username
        // this may fail if username is not unique hence we do it last and isolated
        await db
          .update(users)
          // @ts-ignore
          .set({ username: data.gh_username })
          .where(eq(users.id, userCreated.id));
      } catch (error) {
        console.error("Error updating user:", error);
      }
    } else if (data.name) {
      // we assume this is google
      // we propose an username given it's email
      const username = data.email.split("@")[0];
      try {
        await db
          .insert(socials)
          .values({
            id: crypto.randomUUID(),
            user_id: userCreated.id,
            platform: "email",
            value: data.email,
            image: data.image,
            custom_data: { platform_user_id: data.id },
          })
          .returning()
          .then((res) => res[0] ?? null);

        // set his image
        await db
          .update(users)
          .set({ image: data.image })
          .where(eq(users.id, userCreated.id));

        // last we try to claim his username given his gh_username
        // this may fail if username is not unique hence we do it last and isolated
        await db
          .update(users)
          // @ts-ignore
          .set({ username: username })
          .where(eq(users.id, userCreated.id));
      } catch (error) {
        console.error("Error updating user:", error);
      }
    }

    return userCreated;
  };

  adapter.linkAccount = async (rawAccount): Promise<any> => {
    console.log(rawAccount);
    const updatedAccount = await db
      .insert(accounts)
      .values(rawAccount)
      .returning()
      .get();

    const account: any = {
      ...updatedAccount,
      type: updatedAccount.type,
      access_token: updatedAccount.access_token ?? undefined,
      token_type: updatedAccount.token_type ?? undefined,
      id_token: updatedAccount.id_token ?? undefined,
      refresh_token: updatedAccount.refresh_token ?? undefined,
      scope: updatedAccount.scope ?? undefined,
      expires_at: updatedAccount.expires_at ?? undefined,
      session_state: updatedAccount.session_state ?? undefined,
    };

    return account;
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
    console.log(data);
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
          eq(accounts.providerAccountId, account.providerAccountId),
        ),
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
            eq(verificationTokens.token, token.token),
          ),
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
          eq(accounts.provider, account.provider),
        ),
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
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
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
