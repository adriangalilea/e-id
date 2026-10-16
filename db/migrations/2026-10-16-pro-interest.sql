-- Who asked to be told when Pro opens (db/schema.ts `pro_interest`, app/pro).
-- A new table only. Applied once.
CREATE TABLE `pro_interest` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `created_at` integer NOT NULL
);
