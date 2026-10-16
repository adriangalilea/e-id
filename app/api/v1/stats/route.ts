import { answer, fail, withKey } from "@/lib/api"
import { Stats } from "@/lib/api-schemas"
import { isAdmin } from "@/lib/env"
import { SITE, visitDriver, visitsEnabled } from "@/lib/visit-store"
import { readOwner } from "@/lib/visits"

// Your numbers, as your page shows them (db/actions `ownStats`): every visit to
// your pages and every link your addresses opened, all time. The last 30 days in
// full (per day, what each name opened, referrers, countries) for an admin only,
// until Premium says whose they are (README).

export const GET = withKey(async (_request, { userId }) => {
  if (!visitsEnabled)
    return fail(503, {
      code: "visits_off",
      message: "Visits are not counted here.",
    })
  const report = await readOwner(visitDriver(), {
    site: SITE,
    owner: userId,
    days: 30,
  })
  return answer(Stats, {
    views: report.views,
    hits: report.hits,
    ...(isAdmin(userId) && { detail: report }),
  })
})
