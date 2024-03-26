import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "@auth/core/adapters";

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  username: text("username").unique(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  bio: text("bio"),
  country_code: text("country_code").default("XX").notNull(),
  created_at: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  allow_comments: integer("allow_comments", { mode: "boolean" })
    .notNull()
    .default(false),
  theme: text("theme"),
  languages: text("languages", { mode: "json" }),
  birthDate: integer("birth_date", { mode: "timestamp" }),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const comments = sqliteTable("comment", {
  id: integer("id", { mode: "number" }).notNull().primaryKey(),
  profile_user_id: text("profile_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  commentator_id: text("commentator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  body: text("body").notNull(),
});

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

export const socials = sqliteTable("social", {
  id: text("id").notNull().primaryKey(),
  user_id: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform", {
    enum: socialPlatforms,
  }).notNull(),
  value: text("value").notNull(),
  image: text("image"),
  order: integer("order"),
  context_message: text("context_message"),
  public: integer("public", { mode: "boolean" }).notNull().default(false),
  custom_data: text("custom_data", { mode: "json" }),
});

// custom data can contain:
// followers in [github, twitter, instagram, self, youtube]
// highlight in [twitter, youtube, self]
// channel_id in [youtube]
// platform_user_id in [github, google] created on auth from provider

// this is likely not a good idea long term but for now it's fine and makes less db calls

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertComment = typeof comments.$inferSelect;
export type SelectComment = typeof comments.$inferSelect;

export type InsertSocial = typeof socials.$inferInsert;
export type SelectSocial = typeof socials.$inferSelect;
