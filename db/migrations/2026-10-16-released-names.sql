-- Names left by a deleted account, held from anyone else for a while (db/schema.ts,
-- `releasedNames`). Applied once.
CREATE TABLE `released_name` (
  `name_normalized` text PRIMARY KEY NOT NULL,
  `until` integer NOT NULL
);
