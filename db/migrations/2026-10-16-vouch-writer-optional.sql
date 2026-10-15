-- A vouch outlives its writer's account (db/schema.ts, `comments`): commentator_id
-- becomes optional and is cleared, never cascaded, when they are deleted. SQLite
-- cannot alter a column's constraint, so the table is rebuilt, in one transaction.
-- Applied once.
BEGIN;
CREATE TABLE `comment_new` (
  id TEXT PRIMARY KEY NOT NULL,
  profile_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  commentator_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0
);
INSERT INTO `comment_new` (id, profile_user_id, commentator_id, created_at, updated_at, body, pinned)
  SELECT id, profile_user_id, commentator_id, created_at, updated_at, body, pinned FROM `comment`;
DROP TABLE `comment`;
ALTER TABLE `comment_new` RENAME TO `comment`;
CREATE INDEX profile_user_id_idx ON comment(profile_user_id);
CREATE INDEX commentator_id_idx ON comment(commentator_id);
COMMIT;
