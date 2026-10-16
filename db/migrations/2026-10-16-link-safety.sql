-- Where a link goes is asked of Web Risk (lib/web-risk) when saved and every day
-- after, and a link can be taken down (db/schema.ts `link`). A link made before
-- today keeps a null `created_at` and a null `checked_at`, so the first daily
-- check asks about it first. Applied once.
ALTER TABLE `link` ADD COLUMN `created_at` integer;
ALTER TABLE `link` ADD COLUMN `checked_at` integer;
ALTER TABLE `link` ADD COLUMN `stopped_at` integer;
ALTER TABLE `link` ADD COLUMN `stopped_why` text;
