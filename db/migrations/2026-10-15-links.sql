-- A person's links (db/schema.ts, `links`): the table named for what it holds,
-- the note as the card format names it, and a label, the person's own name for a
-- link. Applied once, in order; libSQL keeps the rows, the index and the foreign
-- key through the renames.
ALTER TABLE `social` RENAME TO `link`;
ALTER TABLE `link` RENAME COLUMN `context_message` TO `note`;
ALTER TABLE `link` ADD COLUMN `label` text;
