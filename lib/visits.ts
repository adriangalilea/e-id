import "server-only";

import { createClient } from "@libsql/client";
import { libsqlDriver } from "@adriangalilea/utils/metrics/libsql";

// e-id's visits, kept by ts-utils' visits module in the Turso database at
// VISITS_DATABASE_URL, apart from the site's own (the `visits_*` tables,
// provisioned once with VISITS_SCHEMA through the Turso CLI, never on a
// request). Off until VISITS_DATABASE_URL is set: the layout
// mounts no sensor and nothing posts to /api/events. On, every page a person
// sees ends in one POST there, a function invocation.

export const SITE = "e-id.to";

export const visitsEnabled = Boolean(process.env.VISITS_DATABASE_URL);

let driver: ReturnType<typeof libsqlDriver> | undefined;
export function visitDriver() {
  const url = process.env.VISITS_DATABASE_URL;
  const authToken = process.env.VISITS_AUTH_TOKEN;
  if (!url || !authToken)
    throw new Error("visits: VISITS_DATABASE_URL and VISITS_AUTH_TOKEN are not set");
  driver ??= libsqlDriver(createClient({ url, authToken }));
  return driver;
}
