import { z } from "zod"
import { forbiddenUsernames } from "@/lib/const"

// What a username may be, the one rule for both sides: the browser checks a
// handle as it is typed, the server before it claims one (lib/username).

export const usernameSchema = z
  .string()
  .trim()
  .min(5, { message: "Username must be at least 5 characters." })
  .regex(/^[a-z0-9-_]+$/, {
    message:
      "Username must only contain lowercase letters, numbers, '-' and '_'.",
  })
  .refine((username: string) => !forbiddenUsernames.includes(username), {
    message: "Username is forbidden.",
  })
