import { forbiddenUsernames } from "@/lib/const"

// What a username may be, the one rule for every side: the browser checks a
// handle as it is typed (lib/card-edit) and reads one from an address
// (components/notice), the server before it claims one (lib/username). Plain
// code, no zod: the 404 and the error pages carry it.

/** Why `username` cannot be one, or null when it can. */
export function usernameProblem(username: string): string | null {
  if (username.length < 5) return "Username must be at least 5 characters."
  if (!/^[a-z0-9-_]+$/.test(username))
    return "Username must only contain lowercase letters, numbers, '-' and '_'."
  if (forbiddenUsernames.includes(username)) return "Username is forbidden."
  return null
}
