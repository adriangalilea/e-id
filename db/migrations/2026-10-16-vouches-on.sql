-- Vouches on for everyone (db/schema.ts, `allow_comments`): the column was false for
-- every account and nothing could turn it on, so every vouch sent was refused. Each
-- owner can now turn them off in the card editor. Applied once.
UPDATE `user` SET allow_comments = 1;
