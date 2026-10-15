import { isAPIError } from "better-auth/api"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isLocalPath } from "@/lib/handoff"

// 👤.to: claims the one-time token e-id.to issued (lib/handoff). better-auth
// consumes it and sets this host's session cookie for the same session, and
// auth.ts's after hook sets this host's display cookie; then the user is back on
// the page they signed in from.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to")
  const token = request.nextUrl.searchParams.get("token")
  if (!isLocalPath(to) || !token)
    return new NextResponse("bad handoff request", { status: 400 })

  const back = NextResponse.redirect(new URL(to, request.url))
  try {
    const { headers } = await auth.api.verifyOneTimeToken({
      body: { token },
      headers: request.headers,
      returnHeaders: true,
    })
    for (const cookie of headers.getSetCookie())
      back.headers.append("set-cookie", cookie)
  } catch (error) {
    // A token used twice (a reload, the back button) or past its three
    // minutes: the user lands where they were, signed out, and signs in again.
    if (!isAPIError(error)) throw error
    console.warn(`handoff claim refused: ${error.message}`)
  }
  return back
}
