import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { EMOJI_ORIGIN } from "@/lib/const";
import { handoffClaimUrl, isLocalPath } from "@/lib/handoff";

// e-id.to: OAuth lands here signed in (lib/handoff). A one-time token for this
// session goes to 👤.to, which claims it. Signed out (the OAuth was refused or
// the cookie is gone), the user goes back where they were, signed out.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");
  if (!isLocalPath(to))
    return new NextResponse("bad handoff request", { status: 400 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(`${EMOJI_ORIGIN}${to}`);

  const { token } = await auth.api.generateOneTimeToken({
    headers: request.headers,
  });
  return NextResponse.redirect(handoffClaimUrl(token, to));
}
