-- Keys to e-ID's API and the CLI's sign-ins under way (db/schema.ts `api_key`,
-- `cli_login`; lib/api-keys). New tables only. Applied once.
CREATE TABLE `api_key` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `prefix` text NOT NULL,
  `hash` text NOT NULL,
  `created_at` integer NOT NULL,
  `last_used_at` integer
);
CREATE UNIQUE INDEX `api_key_hash_unique` ON `api_key` (`hash`);
CREATE INDEX `api_key_user_idx` ON `api_key` (`user_id`);
CREATE TABLE `cli_login` (
  `device_hash` text PRIMARY KEY NOT NULL,
  `user_code` text NOT NULL,
  `host` text NOT NULL,
  `user_id` text REFERENCES `user`(`id`) ON DELETE cascade,
  `denied` integer DEFAULT false NOT NULL,
  `expires_at` integer NOT NULL
);
CREATE UNIQUE INDEX `cli_login_user_code_unique` ON `cli_login` (`user_code`);
