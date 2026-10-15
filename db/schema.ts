import { sql } from "drizzle-orm"
import {
  index,
  integer,
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
    allow_comments: integer("allow_comments", { mode: "boolean" })
      .notNull()
      .default(false),
    theme: text("theme"),
    languages: text("languages", { mode: "json" }),
    birthDate: integer("birth_date", { mode: "timestamp" }),
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
    commentator_id: text("commentator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
 *  their own name for it, a `link`'s only name. Migrations: db/migrations. */
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
    }>(),
  },
  (table) => {
    return {
      userIdIdx: index("user_id_idx").on(table.user_id),
    }
  },
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

// Type exports
export type InsertUser = typeof users.$inferInsert
export type SelectUser = typeof users.$inferSelect

export type InsertComment = typeof comments.$inferSelect
export type SelectComment = typeof comments.$inferSelect

export type InsertLink = typeof links.$inferInsert
export type SelectLink = typeof links.$inferSelect
