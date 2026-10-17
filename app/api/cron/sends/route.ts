import { required } from "@/lib/env"
import { sweepSends } from "@/lib/sends"

// SENDS WHOSE MACHINE NEVER CAME BACK, deleted daily (vercel.json `crons`): a laptop
// closed mid-send and never opened, an `eid send` killed without its Ctrl-C. Unheard
// for a day (lib/sends), the send goes and its name is free again. Called by Vercel's
// cron with CRON_SECRET, by nobody else.

export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !== `Bearer ${required("CRON_SECRET")}`
  )
    return new Response("not yours", { status: 401 })
  return Response.json({ deleted: await sweepSends() })
}
