-- The sign-ins the move from NextAuth to better-auth (2025-11-20) left behind.
-- The users came over, their provider accounts did not: twelve of thirteen users
-- had no `account` row and an unverified email, so better-auth matched them by
-- email and refused to link (`requireLocalEmailVerified`), answering
-- `account_not_linked`. Lulzx hit it on 2026-10-15.
--
-- 1. Every email here came from GitHub or Google (NextAuth had those two
--    providers and nothing else, no password, no magic link), so each was
--    verified by its provider when it was stored. Said so, better-auth links a
--    returning user's provider to them by email, as it does for anyone.
UPDATE `user` SET `emailVerified` = 1 WHERE `emailVerified` IS NULL;

-- 2. The GitHub accounts NextAuth's sign-in recorded on each user's github link
--    (`custom_data.platform_user_id`, GitHub's numeric user id from its OAuth
--    profile, written by the server, never typed): linked back directly, so they
--    sign in whatever email GitHub holds for them now.
INSERT INTO `account` (`id`, `userId`, `accountId`, `providerId`)
SELECT lower(hex(randomblob(16))), l.`user_id`,
       json_extract(l.`custom_data`, '$.platform_user_id'), 'github'
FROM `link` l
WHERE l.`platform` = 'github'
  AND json_extract(l.`custom_data`, '$.platform_user_id') GLOB '[0-9]*'
  AND NOT EXISTS (
    SELECT 1 FROM `account` a
    WHERE a.`providerId` = 'github'
      AND (a.`userId` = l.`user_id`
           OR a.`accountId` = json_extract(l.`custom_data`, '$.platform_user_id'))
  );

-- 3. What better-auth looks rows up by, constrained and indexed as its schema
--    expects (db/schema.ts): one user per email, one user per provider account,
--    a user's sessions and accounts, an OAuth state.
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
CREATE UNIQUE INDEX `account_provider_account_idx` ON `account` (`providerId`, `accountId`);
CREATE INDEX `account_user_idx` ON `account` (`userId`);
CREATE INDEX `session_user_idx` ON `session` (`userId`);
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);

-- 4. The copies the 2025-11-20 move left beside the tables it rebuilt, unread
--    since: the same rows as `user` and `comment` in their old shape.
DROP TABLE `user_backup`;
DROP TABLE `comment_backup`;
