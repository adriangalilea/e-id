-- When a send's machine was last heard from (db/schema.ts `link.seen_at`, lib/sends):
-- its sender's `eid send` asks for its events without pause, and each question says
-- the machine is still there. A send unheard for a minute is paused; one unheard for a
-- day is deleted (the daily sweep). Applied once.
ALTER TABLE `link` ADD COLUMN `seen_at` integer;
