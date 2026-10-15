import { defineConfig } from "drizzle-kit"
import { required } from "./lib/env"

// The database's address and token, from the ignored `.env` (Node reads it).
process.loadEnvFile(".env")

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: required("DB_URL"),
    authToken: required("DB_AUTH_TOKEN"),
  },
})
