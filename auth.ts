import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { oneTimeToken } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "./db";
import { users, accounts, sessions, verification, links } from "@/db/schema";
import {
  EMOJI_DOMAIN_PUNYCODE,
  PROD_URL,
  SESSION_MAX_AGE,
  SHORT_DOMAIN,
} from "@/lib/const";
import {
  CHIP_COOKIE,
  CHIP_COOKIE_OPTIONS,
  chipOf,
  chipValue,
} from "@/lib/chip";
import { USERS_TAG, profileTag, usernameTag } from "@/lib/tags";
import { providedUsername } from "@/lib/username";

type LinkedAccount = {
  userId: string;
  providerId: string;
  accountId: string;
  accessToken?: string | null;
};

/** What a newly linked provider brings to its user's profile: the provider's
 *  handle and email as links, and its avatar. Best effort: a provider that does
 *  not answer leaves the profile as it was. */
async function adoptAccount(account: LinkedAccount) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, account.userId));
  if (!user)
    throw new Error(`linked account for missing user ${account.userId}`);

  const owned = await db
    .select({ platform: links.platform })
    .from(links)
    .where(eq(links.user_id, account.userId));
  const has = (platform: string) => owned.some((l) => l.platform === platform);

  let image: string | null = null;

  if (account.providerId === "github") {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!response.ok) {
      console.error(
        `GitHub profile for ${account.userId}: HTTP ${response.status}`,
      );
      return;
    }
    const profile: { login: string; avatar_url: string } =
      await response.json();
    image = profile.avatar_url;
    if (!has("github"))
      await db.insert(links).values({
        id: crypto.randomUUID(),
        user_id: account.userId,
        platform: "github",
        value: profile.login,
        image,
        custom_data: { platform_user_id: account.accountId },
      });
  } else if (account.providerId !== "google") {
    throw new Error(`unknown provider ${account.providerId}`);
  }

  if (!has("email"))
    await db.insert(links).values({
      id: crypto.randomUUID(),
      user_id: account.userId,
      platform: "email",
      value: user.email,
      custom_data: { platform_user_id: account.accountId },
    });
  if (image)
    await db.update(users).set({ image }).where(eq(users.id, account.userId));

  revalidateTag(profileTag(account.userId), { expire: 0 });
}

/** A setting sign-in cannot work without: missing, the server refuses to start
 *  rather than fail on someone's first sign-in. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`auth: ${name} is not set`);
  return value;
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

  // Where OAuth comes back: e-id.to in production, the dev server's own address
  // locally (http://localhost:3456), which better-auth trusts as its own.
  baseURL: required("BETTER_AUTH_URL"),
  // The site's other hosts, and nothing else: a pattern like `*.vercel.app` let
  // anyone's deployment send requests here with a visitor's session.
  trustedOrigins: [
    PROD_URL,
    `https://${SHORT_DOMAIN}`,
    `https://${EMOJI_DOMAIN_PUNYCODE}`,
  ],
  secret: required("BETTER_AUTH_SECRET"),
  session: { expiresIn: SESSION_MAX_AGE },

  // One person, one e-ID, whichever provider they come back with: a sign-in whose
  // provider vouches for an email we hold joins that account (both GitHub and
  // Google say whether an email is verified, and every email stored here came
  // from one of them). A provider is never trusted blind: an unverified email
  // links nothing.
  account: {
    accountLinking: { enabled: true, trustedProviders: [] },
  },

  plugins: [
    // The session handed from e-id.to to 👤.to (lib/handoff). Tokens are made
    // only by the server (app/api/handoff/issue) and stored hashed.
    oneTimeToken({ disableClientRequest: true, storeToken: "hashed" }),
    nextCookies(),
  ],

  socialProviders: {
    // What each provider calls them seeds their username (`user.create.before`).
    github: {
      clientId: required("GITHUB_CLIENT_ID"),
      clientSecret: required("GITHUB_CLIENT_SECRET"),
      mapProfileToUser: (profile) => ({ username: profile.login }),
    },
    google: {
      clientId: required("GOOGLE_CLIENT_ID"),
      clientSecret: required("GOOGLE_CLIENT_SECRET"),
      mapProfileToUser: (profile) => ({
        username: profile.email.split("@")[0],
      }),
    },
  },

  user: {
    additionalFields: {
      // Seeded when the account is made, never sent by a client: set and renamed
      // only by the site's own actions (lib/username). Null until they pick one.
      username: {
        type: "string",
        required: false,
        input: false,
      },
      username_normalized: {
        type: "string",
        required: false,
        input: false,
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
    user: {
      create: {
        // The username its provider seeded, when it is free; else none yet, and
        // the account corner asks them to pick one (lib/username).
        before: async (user) => {
          const seed =
            typeof user.username === "string"
              ? user.username
              : user.email.split("@")[0];
          const username = await providedUsername(seed);
          return {
            data: { ...user, username, username_normalized: username },
          };
        },
        after: async (user) => {
          if (typeof user.username !== "string") return;
          revalidateTag(USERS_TAG, { expire: 0 });
          revalidateTag(usernameTag(user.username), { expire: 0 });
        },
      },
    },
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
