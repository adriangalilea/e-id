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
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),

  gh_username: text("gh_username").notNull(),
  gh_id: text("gh_id").notNull(),
  gh_image: text("gh_image").notNull(),

  username: text("username").unique(),
  country_code: text("country_code").default("XX").notNull(),
  avatar: text("avatar"),
  created_at: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  bio: text("bio"),
  website: text("website"),
  twitter: text("twitter"),
  youtube: text("youtube"),
});
// TODO: do not allow only numbers in username
// TODO: create a non allowed usernames - ninja

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
  })
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
  })
);

export const comments = sqliteTable("comment", {
  id: integer("id", { mode: "number" }).notNull().primaryKey(),
  profile_id: integer("profile_user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  commentator_id: integer("commentator_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  created_at: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  body: text("body").notNull(),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertComment = typeof comments.$inferSelect;
export type SelectComment = typeof comments.$inferSelect;
