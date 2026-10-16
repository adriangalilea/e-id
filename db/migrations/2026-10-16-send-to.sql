-- Who a send is for (db/schema.ts `send_to`, lib/sends): `eid send --to ada,bob`
-- addresses a send to e-ID accounts, which then wait in their inbox. A public
-- send's password lives, hashed, in its link's `custom_data`. Applied once.
CREATE TABLE `send_to` (
  `link_id` text NOT NULL REFERENCES `link`(`id`) ON DELETE cascade,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `taken_at` integer,
  PRIMARY KEY (`link_id`, `user_id`)
);
CREATE INDEX `send_to_user_idx` ON `send_to` (`user_id`);
