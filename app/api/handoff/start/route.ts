import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { EMOJI_ORIGIN } from "@/lib/const";
import {
  HANDOFF_PROVIDERS,
  type HandoffProvider,
  handoffIssuePath,
  isLocalPath,
} from "@/lib/handoff";

// e-id.to: a 👤.to page's sign-in begins here (lib/handoff). Already signed in
// on e-id.to, the session is handed over at once; otherwise OAuth starts here,
// so its state cookie and its callback are both on e-id.to.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");
  const provider = request.nextUrl.searchParams.get("provider");
  if (!isLocalPath(to) || !HANDOFF_PROVIDERS.includes(provider as HandoffProvider))
    return new NextResponse("bad handoff request", { status: 400 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (session)
    return NextResponse.redirect(new URL(handoffIssuePath(to), request.url));

  const { headers, response } = await auth.api.signInSocial({
    body: {
      provider: provider as HandoffProvider,
      callbackURL: handoffIssuePath(to),
      errorCallbackURL: `${EMOJI_ORIGIN}${to}`,
    },
    headers: request.headers,
    returnHeaders: true,
  });
  if (!response.url) throw new Error(`no OAuth url for ${provider}`);

  const redirect = NextResponse.redirect(response.url);
  for (const cookie of headers.getSetCookie())
    redirect.headers.append("set-cookie", cookie);
  return redirect;
}
