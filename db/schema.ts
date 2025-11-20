import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

// USER TABLE - better-auth core + custom fields
export const users = sqliteTable(
  "user",
  {
    // better-auth core fields
    id: text("id").notNull().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
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
    };
  },
);

// SESSION TABLE - better-auth exact schema
export const sessions = sqliteTable("session", {
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
});

// ACCOUNT TABLE - better-auth exact schema
export const accounts = sqliteTable("account", {
  id: text("id").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
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
});

// VERIFICATION TABLE - better-auth exact schema
export const verification = sqliteTable("verification", {
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
});

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
    };
  },
);

export const socialPlatforms = [
  "email",
  "youtube",
  "github",
  "twitter",
  "website",
  "self",
  "instagram",
  "telegram",
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const socials = sqliteTable(
  "social",
  {
    id: text("id").notNull().primaryKey(),
    user_id: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    platform: text("platform", {
      enum: socialPlatforms,
    }).notNull(),
    value: text("value"),
    image: text("image"),
    order: integer("order"),
    context_message: text("context_message"),
    public: integer("public", { mode: "boolean" }).notNull().default(false),
    custom_data: text("custom_data", { mode: "json" }).$type<{
      highlight?: string;
      platform_user_id?: string;
      channel_id?: string;
      followers?: number;
    }>(),
  },
  (table) => {
    return {
      userIdIdx: index("user_id_idx").on(table.user_id),
    };
  },
);

// Type exports
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertComment = typeof comments.$inferSelect;
export type SelectComment = typeof comments.$inferSelect;

export type InsertSocial = typeof socials.$inferInsert;
export type SelectSocial = typeof socials.$inferSelect;
