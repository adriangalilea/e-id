import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { oneTimeToken } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "./db";
import { users, accounts, sessions, verification, socials } from "@/db/schema";
import {
  EMOJI_DOMAIN_PUNYCODE,
  PROD_URL,
  SESSION_MAX_AGE,
  SHORT_DOMAIN,
} from "@/lib/const";
import { CHIP_COOKIE, CHIP_COOKIE_OPTIONS, chipOf, chipValue } from "@/lib/chip";
import { USERS_TAG, profileTag, usernameTag } from "@/lib/tags";
import { claimUsername } from "@/lib/username";

type LinkedAccount = {
  userId: string;
  providerId: string;
  accountId: string;
  accessToken?: string | null;
};

/** What a newly linked provider brings to its user's profile: the provider's
 *  handle and email as socials, its avatar, and its handle as the username when
 *  the user has none and it is free. Best effort: a provider that does not answer
 *  or a username already taken leaves the user to choose one on /null. */
async function adoptAccount(account: LinkedAccount) {
  const [user] = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(eq(users.id, account.userId));
  if (!user) throw new Error(`linked account for missing user ${account.userId}`);

  const owned = await db
    .select({ platform: socials.platform })
    .from(socials)
    .where(eq(socials.user_id, account.userId));
  const has = (platform: string) => owned.some((s) => s.platform === platform);

  let image: string | null = null;
  let proposed: string | null = null;

  if (account.providerId === "github") {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!response.ok) {
      console.error(`GitHub profile for ${account.userId}: HTTP ${response.status}`);
      return;
    }
    const profile: { login: string; avatar_url: string } = await response.json();
    image = profile.avatar_url;
    proposed = profile.login.toLowerCase();
    if (!has("github"))
      await db.insert(socials).values({
        id: crypto.randomUUID(),
        user_id: account.userId,
        platform: "github",
        value: profile.login,
        image,
        custom_data: { platform_user_id: account.accountId },
      });
  } else if (account.providerId === "google") {
    proposed = user.email.split("@")[0].toLowerCase();
  } else {
    throw new Error(`unknown provider ${account.providerId}`);
  }

  if (!has("email"))
    await db.insert(socials).values({
      id: crypto.randomUUID(),
      user_id: account.userId,
      platform: "email",
      value: user.email,
      custom_data: { platform_user_id: account.accountId },
    });
  if (image)
    await db.update(users).set({ image }).where(eq(users.id, account.userId));

  revalidateTag(profileTag(account.userId), { expire: 0 });
  if (user.username || !proposed) return;
  try {
    const username = await claimUsername(account.userId, proposed);
    revalidateTag(USERS_TAG, { expire: 0 });
    revalidateTag(usernameTag(username), { expire: 0 });
  } catch (error) {
    console.error(`username ${proposed} for ${account.userId}:`, error);
  }
}

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

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    PROD_URL,
    `https://${SHORT_DOMAIN}`,
    `https://${EMOJI_DOMAIN_PUNYCODE}`,
    "http://localhost:3000",
    "*.vercel.app", // all vercel preview deployments
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  session: { expiresIn: SESSION_MAX_AGE },

  plugins: [
    // The session handed from e-id.to to 👤.to (lib/handoff). Tokens are made
    // only by the server (app/api/handoff/issue) and stored hashed.
    oneTimeToken({ disableClientRequest: true, storeToken: "hashed" }),
    nextCookies(),
  ],

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

  databaseHooks: {
    account: {
      create: {
        // A provider linked for the first time: sign-up, or a second provider.
        // Runs after the OAuth callback's transaction commits.
        after: async (account) => {
          await adoptAccount(account);
        },
      },
    },
  },

  hooks: {
    // The display cookie (lib/chip) follows the session on the host that holds
    // it: written where a sign-in creates one (an OAuth callback on e-id.to, a
    // handoff claimed on 👤.to), cleared on sign-out.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out") {
        ctx.setCookie(CHIP_COOKIE, "", { ...CHIP_COOKIE_OPTIONS, maxAge: 0 });
        return;
      }
      if (
        !ctx.path.startsWith("/callback/") &&
        !ctx.path.startsWith("/sign-in") &&
        ctx.path !== "/one-time-token/verify"
      )
        return;
      const session = ctx.context.newSession;
      if (!session) return;
      const [user] = await db
        .select({ username: users.username, image: users.image })
        .from(users)
        .where(eq(users.id, session.user.id));
      if (!user) throw new Error(`session for missing user ${session.user.id}`);
      ctx.setCookie(CHIP_COOKIE, chipValue(chipOf(user)), CHIP_COOKIE_OPTIONS);
    }),
  },
});
