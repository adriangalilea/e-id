-- What happened to a send, for its sender to watch live (db/schema.ts `send_event`,
-- lib/sends): its ticket asked for, its file said to have come, by whom where they
-- were signed in. Gone with the send. Applied once.
CREATE TABLE `send_event` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `link_id` text NOT NULL REFERENCES `link`(`id`) ON DELETE cascade,
  `kind` text NOT NULL,
  `user_id` text REFERENCES `user`(`id`) ON DELETE set null,
  `at` integer NOT NULL
);
CREATE INDEX `send_event_link_idx` ON `send_event` (`link_id`);
