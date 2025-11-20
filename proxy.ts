import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";
import {
  MAIN_DOMAIN,
  SHORT_DOMAIN,
  EMOJI_DOMAIN,
  EMOJI_DOMAIN_PUNYCODE,
} from "./lib/const";

export async function proxy(request: NextRequest) {
  // start a console timer
  const pathname = request.nextUrl.pathname;

  // check if user session has username if not redirect to /null if not already there
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (
    session?.user &&
    (!session.user.username || !session.user.username_normalized) &&
    pathname !== "/null"
  ) {
    return NextResponse.redirect(new URL("/null", request.url));
  } else if (!session?.user && pathname === "/null") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // if the request is localhost, return
  const hostHeaders = request.headers.get("host") ?? "";
  if (hostHeaders.startsWith("localhost")) {
    return;
  }

  // list of domains with www
  const shortDomainWWW = `www.${SHORT_DOMAIN}`;
  const mainDomainWWW = `www.${MAIN_DOMAIN}`;
  const emojiDomainWWW = `www.${EMOJI_DOMAIN}`;
  const emojiDomainPunycodeWWW = `www.${EMOJI_DOMAIN_PUNYCODE}`;

  // list https url's
  const shortHttps = `https://${SHORT_DOMAIN}`;
  const mainHttps = `https://${MAIN_DOMAIN}`;
  const emojiHttps = `https://${EMOJI_DOMAIN}`;
  const emojiHttpsPunycode = `https://${EMOJI_DOMAIN_PUNYCODE}`;

  const userAgent = request.headers.get("user-agent") ?? "";

  // check if the user agent is Safari and not Chrome
  // since safari does support emoji domains and chrome does not
  const useEmojiDomain =
    /Safari/i.test(userAgent) &&
    /Version\//i.test(userAgent) &&
    !/Chrome/i.test(userAgent) &&
    !/CriOS/i.test(userAgent);

  const targetUrl = useEmojiDomain ? emojiHttps : mainHttps;
  const targetDomain = useEmojiDomain ? EMOJI_DOMAIN : MAIN_DOMAIN;
  const targetDomainWWW = useEmojiDomain ? emojiDomainWWW : mainDomainWWW;
  const targetDomainPunycode = useEmojiDomain
    ? EMOJI_DOMAIN_PUNYCODE
    : MAIN_DOMAIN;
  const targetDomainPunycodeWWW = useEmojiDomain
    ? emojiDomainPunycodeWWW
    : mainDomainWWW;

  // console.log("targetDomain pre", targetDomain);
  // console.log("hostHeaders pre", hostHeaders);
  // console.log("targetUrl pre", targetUrl);

  // rewrite only if targetUrl is not the same as the current
  if (
    targetDomain === hostHeaders ||
    targetDomainWWW === hostHeaders ||
    targetDomainPunycode === hostHeaders ||
    targetDomainPunycodeWWW === hostHeaders
  ) {
    // console.log("targetUrl is the same as the current");
    // finnish console timer
    return;
  }

  // console.log("targetDomain", targetDomain);
  // console.log("hostHeaders", hostHeaders);
  // console.log("targetUrl", targetUrl);
  return NextResponse.redirect(new URL(pathname, targetUrl));
}

// Optionally, don't invoke Middleware on some paths
export const config = {
  // matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|auth|trpc)(.*)"],
  matcher: ["/((?!auth|api|_next/static|_next/image|favicon.ico).*)"],
};
