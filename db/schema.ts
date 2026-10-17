import { sql } from "drizzle-orm"
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { linkPlatforms } from "@/lib/platforms"

// USER TABLE - better-auth core + custom fields
export const users = sqliteTable(
  "user",
  {
    // better-auth core fields
    id: text("id").notNull().primaryKey(),
    name: text("name"),
    // One person per email: better-auth finds a returning user by it to link
    // another provider to them.
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" }),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    // custom fields
    username: text("username"),
    username_normalized: text("username_normalized").unique(),
    bio: text("bio"),
    country_code: text("country_code").default("XX").notNull(),
    // Whether people can leave a vouch on their page: on unless they turn it off
    // (the card editor). Pinned vouches stay shown either way.
    allow_comments: integer("allow_comments", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => {
    return {
      usernameIdx: index("username_idx").on(table.username),
      createdAtIdx: index("created_at_idx").on(table.createdAt),
    }
  },
)

// SESSION TABLE - better-auth exact schema, indexed by its user (better-auth
// lists and revokes a user's sessions by it).
export const sessions = sqliteTable(
  "session",
  {
    id: text("id").notNull().primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({ userIdx: index("session_user_idx").on(table.userId) }),
)

// ACCOUNT TABLE - better-auth exact schema. A provider's account belongs to one
// user (unique on provider and its id): signing in finds it by those two.
export const accounts = sqliteTable(
  "account",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
    userIdx: index("account_user_idx").on(table.userId),
  }),
)

// VERIFICATION TABLE - better-auth exact schema, looked up by identifier (an
// OAuth sign-in's state).
export const verification = sqliteTable(
  "verification",
  {
    id: text("id").notNull().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
)

// CUSTOM TABLES (not part of better-auth)

export const comments = sqliteTable(
  "comment",
  {
    id: text("id").notNull().primaryKey(),
    profile_user_id: text("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Who wrote it; null once they deleted their account: the vouch stays on the
    // page it was written for, signed by nobody (lib/data `writerOf`).
    commentator_id: text("commentator_id").references(() => users.id, {
      onDelete: "set null",
    }),
    created_at: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updated_at: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    body: text("body").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  },
  (table) => {
    return {
      profileUserIdIdx: index("profile_user_id_idx").on(table.profile_user_id),
      commentatorIdIdx: index("commentator_id_idx").on(table.commentator_id),
    }
  },
)

/** A person's links, one row each, in their order (`order`). `value` is the
 *  username there, or the whole address where the platform takes none; `label`
 *  their own name for it, a `link`'s only name. A `link` (anywhere at all) is also
 *  an address of theirs, `/you/<slug>` (app/[username]/[link]), which can stop
 *  opening at `expires_at` or after `max_visits` opens (`visits` counts them).
 *  Migrations: db/migrations. */
export const links = sqliteTable(
  "link",
  {
    id: text("id").notNull().primaryKey(),
    user_id: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    platform: text("platform", {
      enum: linkPlatforms,
    }).notNull(),
    value: text("value"),
    label: text("label"),
    image: text("image"),
    order: integer("order"),
    note: text("note"),
    public: integer("public", { mode: "boolean" }).notNull().default(false),
    custom_data: text("custom_data", { mode: "json" }).$type<{
      highlight?: string
      platform_user_id?: string
      channel_id?: string
      followers?: number
      /** A send's file (`kind` "send"): its name and size in bytes. */
      file?: { name: string; size: number }
      /** A public send's password, hashed (lib/sends `hashPassword`): its ticket is
       *  given only to whoever says it. */
      password?: string
    }>(),
    /** What a link of their own is: `url`, a redirect to its value; or `send`,
     *  a file served from its owner's machine (lib/sends), its value the sendme
     *  ticket, opened by `eid get`. One namespace for both (`slug`). */
    kind: text("kind", { enum: ["url", "send"] })
      .notNull()
      .default("url"),
    /** A `link`'s address name, lowercase: `/you/<slug>`. Null on a platform's. */
    slug: text("slug"),
    expires_at: integer("expires_at", { mode: "timestamp" }),
    max_visits: integer("max_visits"),
    visits: integer("visits").notNull().default(0),
    /** When it was made; null for a link made before it was kept. */
    created_at: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    /** When where it goes was last asked of Safe Browsing (lib/safe-browsing); null for
     *  never, which the daily check takes first. */
    checked_at: integer("checked_at", { mode: "timestamp" }),
    /** Taken down: it opens nothing and leaves the card (lib/data reads only
     *  links without it). Why in `stopped_why`: a Safe Browsing threat, or "admin". */
    stopped_at: integer("stopped_at", { mode: "timestamp" }),
    stopped_why: text("stopped_why"),
    /** A send's machine, last heard from (lib/sends `heard`): its `eid send` asking
     *  for its events. Null on every other link. */
    seen_at: integer("seen_at", { mode: "timestamp" }),
  },
  (table) => {
    return {
      userIdIdx: index("user_id_idx").on(table.user_id),
      // One address name per person; a platform's link has none.
      slugIdx: uniqueIndex("link_user_slug_idx")
        .on(table.user_id, table.slug)
        .where(sql`${table.slug} IS NOT NULL`),
    }
  },
)

// WHO A SEND IS FOR (`eid send --to ada,bob`, lib/sends): a send with rows here is
// addressed, never public: its ticket goes only to these people's keys, it waits in
// their inbox, and its sender sees who took it. Its rows go with the send (the name is
// deleted when the sender stops) and with an account deleted. Migrations: db/migrations.
export const sendTo = sqliteTable(
  "send_to",
  {
    link_id: text("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** When they first asked for its ticket; null while it waits. */
    taken_at: integer("taken_at", { mode: "timestamp" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.link_id, table.user_id] }),
    userIdx: index("send_to_user_idx").on(table.user_id),
  }),
)

// WHAT HAPPENED TO A SEND, for its sender to watch live (`eid send` prints each, lib/sends):
// someone said yes to it ("asked", a download starting), said no ("declined"), or said
// the file came ("got"). Who, where they were signed in; nothing of anyone else, no address. The
// events go with the send, when its sender stops. Migrations: db/migrations.
export const sendEvents = sqliteTable(
  "send_event",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    link_id: text("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["asked", "got", "declined"] }).notNull(),
    /** Who, signed in; null for someone without a key. */
    user_id: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({ linkIdx: index("send_event_link_idx").on(table.link_id) }),
)

// A NAME A PERSON ALSO ANSWERS TO: a former username, or one more they hold, each a
// permanent redirect to their page (paths too: /old/gh opens /new/gh), so a new
// main name keeps every link people already have. Held as a username is: nobody
// else can take it (lib/username). Migrations: db/migrations.
export const usernameAliases = sqliteTable(
  "username_alias",
  {
    alias_normalized: text("alias_normalized").notNull().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => ({ userIdx: index("username_alias_user_idx").on(table.user_id) }),
)

// A NAME LEFT BY A DELETED ACCOUNT, held from anyone else until `until` (lib/username,
// RELEASE_HOLD_MS): the links to it still out there would otherwise open a stranger's
// page the day after. Nothing else of the person is kept: the name alone, unlinked.
export const releasedNames = sqliteTable("released_name", {
  name_normalized: text("name_normalized").notNull().primaryKey(),
  until: integer("until", { mode: "timestamp" }).notNull(),
})

// A KEY TO E-ID'S API (lib/api-keys): what the `eid` CLI holds, a person's for as
// long as they keep it. Only its hash is kept; the key itself (`eid_…`) is shown
// once, to whatever asked for it. Gone with its person.
export const apiKeys = sqliteTable(
  "api_key",
  {
    id: text("id").notNull().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** What the person reads it as: "eid on mbp-m5". */
    name: text("name").notNull(),
    /** The key's first characters, to tell keys apart in a list. */
    prefix: text("prefix").notNull(),
    /** SHA-256 of the key, hex: how a request's key is found. */
    hash: text("hash").notNull().unique(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
    last_used_at: integer("last_used_at", { mode: "timestamp" }),
  },
  (table) => ({ userIdx: index("api_key_user_idx").on(table.user_id) }),
)

// WHO ASKED TO BE TOLD WHEN PRO OPENS (app/pro): a person and when, nothing
// else, gone with them. How many would pay is what says when billing is worth
// building (README, Premium).
export const proInterest = sqliteTable("pro_interest", {
  user_id: text("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
})

// HOW MANY WRITES A KEY MADE ON A DAY (UTC), counted as each is made, so a key
// is held to its day's most across every server (lib/api). Gone with its key.
export const apiKeyDays = sqliteTable(
  "api_key_day",
  {
    key_id: text("key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    /** "2026-10-16". */
    day: text("day").notNull(),
    writes: integer("writes").notNull().default(0),
  },
  (table) => ({ pk: primaryKey({ columns: [table.key_id, table.day] }) }),
)

// A SIGN-IN OF THE CLI UNDER WAY (the OAuth device flow, RFC 8628): `eid login`
// asked for it, its person approves it at /cli, and the CLI's next question takes
// a key for it and ends it. Minutes long; one unanswered is let go.
export const cliLogins = sqliteTable("cli_login", {
  /** SHA-256 of the code only the CLI holds, hex. */
  device_hash: text("device_hash").notNull().primaryKey(),
  /** What the person compares and approves: "WXYZ-1234". */
  user_code: text("user_code").notNull().unique(),
  /** The machine it says it runs on, for the key's name and the approval. */
  host: text("host").notNull(),
  /** Who approved it; null while it waits. */
  user_id: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  /** Refused by its person: the CLI is told so, not left waiting. */
  denied: integer("denied", { mode: "boolean" }).notNull().default(false),
  expires_at: integer("expires_at", { mode: "timestamp" }).notNull(),
})

export type SelectComment = typeof comments.$inferSelect
export type SelectLink = typeof links.$inferSelect
