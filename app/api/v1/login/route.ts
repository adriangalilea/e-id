import { answer, bodyAs, fail } from "@/lib/api"
import { startLogin } from "@/lib/api-keys"
import { LoginStartBody, LoginStarted } from "@/lib/api-schemas"
import { allowed, callerOf } from "@/lib/rate-limit"

// `eid login`, its first step (lib/api-keys): a sign-in begun for the machine
// the CLI names, answered with the codes the device flow needs (RFC 8628 §3.2).
// No key needed: this is how one is had. At most 10 a caller every 10 minutes.

export async function POST(request: Request) {
  if (!allowed(`login:${callerOf(request.headers)}`, 10, 10 * 60_000))
    return fail(429, { code: "slow_down", message: "Too many sign-ins begun." })
  const body = await bodyAs(request, LoginStartBody)
  if (body instanceof Response) return body
  return answer(
    LoginStarted,
    await startLogin(body.host, new URL(request.url).origin),
  )
}
