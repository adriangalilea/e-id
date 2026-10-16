-- A `link` is an address of its owner's too, /you/<slug> (db/schema.ts, `links`),
-- that can expire by a date or a number of opens. Applied once.
ALTER TABLE `link` ADD COLUMN `slug` text;
ALTER TABLE `link` ADD COLUMN `expires_at` integer;
ALTER TABLE `link` ADD COLUMN `max_visits` integer;
ALTER TABLE `link` ADD COLUMN `visits` integer DEFAULT 0 NOT NULL;
CREATE UNIQUE INDEX `link_user_slug_idx` ON `link` (`user_id`, `slug`) WHERE `slug` IS NOT NULL;
