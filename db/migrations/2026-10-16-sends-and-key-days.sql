-- A link of one's own is a redirect (`url`) or a file served from its owner's
-- machine (`send`, lib/sends), and every key's writes are counted per day
-- (db/schema.ts `link.kind`, `api_key_day`). Every link there is today is a
-- redirect. Applied once.
ALTER TABLE `link` ADD COLUMN `kind` text DEFAULT 'url' NOT NULL;
CREATE TABLE `api_key_day` (
  `key_id` text NOT NULL REFERENCES `api_key`(`id`) ON DELETE cascade,
  `day` text NOT NULL,
  `writes` integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (`key_id`, `day`)
);
