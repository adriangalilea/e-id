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
  email_public: integer("email_public", { mode: "boolean" }).default(false),
  image: text("image"),
  bio: text("bio"),
  country_code: text("country_code").default("XX").notNull(),
  created_at: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});
// TODO: add birthdate
// TODO: add languages
// TODO: add allow comments boolean
// TODO: add theme casey

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

export const socials = sqliteTable("social", {
  id: text("id").notNull().primaryKey(),
  user_id: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform", {
    enum: [
      "youtube",
      "github",
      "google",
      "twitter",
      "website",
      "self",
      "instagram",
      "email",
      "telegram",
    ],
  }).notNull(),
  custom_data: text("custom_data", { mode: "json" }).$type<{ a: 1 }>(),
  context_message: text("context_message"),
  order: integer("order"),
  public: integer("public", { mode: "boolean" }).notNull().default(false),
});

export const github = sqliteTable("github", {
  id: text("id").notNull().primaryKey(),
  social_id: text("social_id").references(() => socials.id, {
    onDelete: "cascade",
  }),
  github_user_id: integer("github_user_id"),
  username: text("username"),
  image: text("image"),
  code_frequency_graph: text("code_frequency_graph"),
  followers: integer("followers"),
});

export const google = sqliteTable("google", {
  id: text("id").notNull().primaryKey(),
  social_id: text("social_id").references(() => socials.id, {
    onDelete: "cascade",
  }),
  google_user_id: text("google_user_id"),
  email: text("email"),
  image: text("image"),
});

export const youtube = sqliteTable("youtube", {
  id: text("id").notNull().primaryKey(),
  social_id: text("social_id").references(() => socials.id, {
    onDelete: "cascade",
  }),
  channel_id: text("channel_id"),
  username: text("username"),
  image: text("image"),
  highlighted_video: text("highlighted_video"),
  followers: integer("followers"),
});

export const twitter = sqliteTable("twitter", {
  id: text("id").notNull().primaryKey(),
  social_id: text("social_id").references(() => socials.id, {
    onDelete: "cascade",
  }),
  username: text("username"),
  image: text("image"),
  highlighted_tweet: text("highlighted_tweet"),
  followers: integer("followers"),
});

export const telegram = sqliteTable("telegram", {
  id: text("id").notNull().primaryKey(),
  social_id: text("social_id").references(() => socials.id, {
    onDelete: "cascade",
  }),
  username: text("username"),
  image: text("image"),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertComment = typeof comments.$inferSelect;
export type SelectComment = typeof comments.$inferSelect;

export type InsertSocial = typeof socials.$inferInsert;
export type SelectSocial = typeof socials.$inferSelect;

export type InsertGithub = typeof github.$inferInsert;
export type SelectGithub = typeof github.$inferSelect;

export type InsertGoogle = typeof google.$inferInsert;
export type SelectGoogle = typeof google.$inferSelect;

export type InsertTwitter = typeof twitter.$inferInsert;
export type SelectTwitter = typeof twitter.$inferSelect;

export type InsertTelegram = typeof telegram.$inferInsert;
export type SelectTelegram = typeof telegram.$inferSelect;
