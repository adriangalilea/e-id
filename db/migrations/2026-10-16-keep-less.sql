-- What e-ID never needed (auth.ts): three profile fields nothing reads or wrote,
-- the providers' tokens (read once, at linking), and the IP address and browser of
-- each session. Applied once.
ALTER TABLE `user` DROP COLUMN `theme`;
ALTER TABLE `user` DROP COLUMN `languages`;
ALTER TABLE `user` DROP COLUMN `birth_date`;
UPDATE `account` SET accessToken = NULL, refreshToken = NULL, idToken = NULL, accessTokenExpiresAt = NULL, refreshTokenExpiresAt = NULL;
UPDATE `session` SET ipAddress = NULL, userAgent = NULL;
