import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { users, accounts, sessions, verification, socials } from "@/db/schema";
import { createAuthMiddleware } from "better-auth/api";
import { setUsername } from "@/db/actions";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: users,
      account: accounts,
      session: sessions,
      verification: verification,
    },
  }),

  secret: process.env.BETTER_AUTH_SECRET!,

  plugins: [nextCookies()],

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      username_normalized: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      country_code: {
        type: "string",
        required: true,
        defaultValue: "XX",
      },
      allow_comments: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      theme: {
        type: "string",
        required: false,
      },
      languages: {
        type: "string",
        required: false,
      },
      birthDate: {
        type: "number",
        required: false,
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only run after OAuth sign-in/sign-up
      if (!ctx.path.startsWith("/sign-in/social")) {
        return;
      }

      const newSession = ctx.context.newSession;
      if (!newSession) {
        return;
      }

      const userId = newSession.user.id;
      const userEmail = newSession.user.email;

      // Get the account to determine provider
      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId));

      if (!userAccounts || userAccounts.length === 0) {
        return;
      }

      const account = userAccounts[0];
      const providerId = account.providerId;

      try {
        if (providerId === "github") {
          // For GitHub, we need to fetch the profile to get username
          // The account.accountId is the GitHub user ID
          const githubId = account.accountId;

          // Fetch GitHub profile using the access token
          const response = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (response.ok) {
            const profile = await response.json();
            const githubUsername = profile.login;
            const githubAvatarUrl = profile.avatar_url;

            // Create GitHub social entry
            await db.insert(socials).values({
              id: crypto.randomUUID(),
              user_id: userId,
              platform: "github",
              value: githubUsername,
              image: githubAvatarUrl,
              custom_data: {
                platform_user_id: githubId,
              },
            });

            // Create email social entry
            await db.insert(socials).values({
              id: crypto.randomUUID(),
              user_id: userId,
              platform: "email",
              value: userEmail,
            });

            // Set user image
            await db
              .update(users)
              .set({ image: githubAvatarUrl })
              .where(eq(users.id, userId));

            // Try to claim username
            const user = await db
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .then((res) => res[0]);

            if (user) {
              await setUsername(user, githubUsername);
            }
          }
        } else if (providerId === "google") {
          // For Google
          const googleId = account.accountId;
          const proposedUsername = userEmail.split("@")[0];

          // Create email social entry with Google data
          await db.insert(socials).values({
            id: crypto.randomUUID(),
            user_id: userId,
            platform: "email",
            value: userEmail,
            image: newSession.user.image || undefined,
            custom_data: {
              platform_user_id: googleId,
            },
          });

          // Set user image if available
          if (newSession.user.image) {
            await db
              .update(users)
              .set({ image: newSession.user.image })
              .where(eq(users.id, userId));
          }

          // Try to claim username
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .then((res) => res[0]);

          if (user) {
            await setUsername(user, proposedUsername);
          }
        }

        revalidatePath("/");
        revalidateTag("users", "max");
      } catch (error) {
        console.error("Error in post-OAuth hook:", error);
        // Don't throw - let the sign-in succeed even if social creation fails
      }
    }),
  },
});
