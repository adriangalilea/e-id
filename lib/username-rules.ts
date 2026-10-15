import { forbiddenUsernames } from "@/lib/const"

// What a username may be, the one rule for every side: the browser checks a
// handle as it is typed (lib/card-edit) and reads one from an address
// (components/notice), the server before it claims one (lib/username). Plain
// code, no zod: the 404 and the error pages carry it.

/** The shortest username anyone can take. Below it, down to `SHORT_MIN`, names
 *  are kept to be sold (README, Premium); below that, 1 and 2 characters, they
 *  are e-ID's own paths. */
export const OPEN_MIN = 5
export const SHORT_MIN = 3

/** Why `username` cannot be one, or null when it can. */
export function usernameProblem(username: string): string | null {
  if (username.length >= SHORT_MIN && username.length < OPEN_MIN)
    return `Names of ${SHORT_MIN} and ${OPEN_MIN - 1} characters are kept for later.`
  if (username.length < OPEN_MIN)
    return `Username must be at least ${OPEN_MIN} characters.`
  if (!/^[a-z0-9-_]+$/.test(username))
    return "Username must only contain lowercase letters, numbers, '-' and '_'."
  if (forbiddenUsernames.includes(username)) return "Username is forbidden."
  return null
}
