-- Names a person also answers to (db/schema.ts, `usernameAliases`): a former
-- username, or one more they hold, each redirecting to their page. Applied once.
CREATE TABLE `username_alias` (
  `alias_normalized` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX `username_alias_user_idx` ON `username_alias` (`user_id`);
