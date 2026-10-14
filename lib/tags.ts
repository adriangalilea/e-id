// Cache tags, one per thing a write can change. Every public page is prerendered
// from reads tagged here and stays cached until a write expires its tag: nothing
// in this app is revalidated on a timer except GitHub's contribution calendar.

/** Every list of users: the home's latest sign-ups, the sitemap, the static params. */
export const USERS_TAG = "users";

/** Everything a profile page shows that belongs to this user: their row, their
 *  links, the testimonials on their profile, and their name and face on the
 *  testimonials they wrote on other profiles. */
export const profileTag = (userId: string) => `profile:${userId}`;

/** A username's lookup, including the lookup that found nobody: claiming a
 *  username expires it so the 404 cached for it goes away. */
export const usernameTag = (username: string) =>
  `username:${username.toLowerCase()}`;

/** One GitHub login's contribution calendar. */
export const githubTag = (login: string) => `github:${login.toLowerCase()}`;
