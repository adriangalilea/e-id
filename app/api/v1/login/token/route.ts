import { bodyOf, fail } from "@/lib/api"
import { claimLogin } from "@/lib/api-keys"

// `eid login`, asking after its sign-in every few seconds (RFC 8628 §3.4):
// the key once its person approved it at /cli, else why not yet, in the RFC's
// own words (`authorization_pending`, `access_denied`, `expired_token`).

const WORDS = {
  authorization_pending: "Waiting for you to approve it in the browser.",
  access_denied: "The sign-in was refused in the browser.",
  expired_token: "The sign-in took too long: run `eid login` again.",
} as const

export async function POST(request: Request) {
  const body = await bodyOf(request)
  if (body instanceof Response) return body
  const device = (body as { device_code?: unknown }).device_code
  if (typeof device !== "string" || device.length < 20)
    return fail(400, { code: "bad_device_code", message: "No device code." })
  const claimed = await claimLogin(device)
  if (claimed.state === "ok")
    return Response.json({ key: claimed.key, username: claimed.username })
  return fail(400, { code: claimed.state, message: WORDS[claimed.state] })
}
