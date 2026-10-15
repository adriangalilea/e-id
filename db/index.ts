import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { required } from "@/lib/env"

const client = createClient({
  url: required("DB_URL"),
  authToken: required("DB_AUTH_TOKEN"),
})

export const db = drizzle(client)
