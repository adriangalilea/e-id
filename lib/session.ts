import "server-only"

import { headers } from "next/headers"
import { connection } from "next/server"
import { cache } from "react"
import { auth } from "@/auth"

// The session, read once per request however many callers ask. Only the server
// actions read it: public pages never do, so they prerender whole and a visit
// runs no function. connection() first, so a prerender stops here before better-auth
// starts any IO.
export const getSession = cache(async () => {
  await connection()
  return auth.api.getSession({ headers: await headers() })
})
