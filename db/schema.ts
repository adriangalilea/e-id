import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" })
    .notNull()
    .primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").unique().notNull(),
  country_code: text("country_code").notNull(),
  avatar: text("avatar"),
  created_at: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updated_at: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  bio: text("bio"),
  email: text("email"),
  website: text("website"),
  twitter: text("twitter"),
  github: text("github"),
  youtube: text("youtube"),
});
// TODO: do not allow only numbers in username
// TODO: create a non allowed usernames - ninja

export const comments = sqliteTable("comments", {
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
