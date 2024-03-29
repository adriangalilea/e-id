import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostHeaders = request.headers.get("host") ?? "";
  const localhost = "localhost:3000";
  // if the request is localhost, do nothing
  if (hostHeaders === localhost) {
    return;
  }

  // list of domains
  const shortDomain = "eid.to";
  const mainDomain = "e-id.to";
  const emojiDomain = "👤.to";
  const emojiDomainPunycode = "xn--mq8h.to";

  // list of domains with www
  const shortDomainWWW = `www.${shortDomain}`;
  const mainDomainWWW = `www.${mainDomain}`;
  const emojiDomainWWW = `www.${emojiDomain}`;
  const emojiDomainPunycodeWWW = `www.${emojiDomainPunycode}`;

  // list https url's
  const shortHttps = `https://${shortDomain}`;
  const mainHttps = `https://${mainDomain}`;
  const emojiHttps = `https://${emojiDomain}`;
  const emojiHttpsPunycode = `https://${emojiDomainPunycode}`;

  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") ?? "";

  // check if the user agent is Safari and not Chrome
  // since safari does support emoji domains and chrome does not
  const useEmojiDomain =
    /Safari/i.test(userAgent) &&
    /Version\//i.test(userAgent) &&
    !/Chrome/i.test(userAgent) &&
    !/CriOS/i.test(userAgent);

  const targetUrl = useEmojiDomain ? emojiHttps : mainHttps;
  const targetDomain = useEmojiDomain ? emojiDomain : mainDomain;
  const targetDomainWWW = useEmojiDomain ? emojiDomainWWW : mainDomainWWW;
  const targetDomainPunycode = useEmojiDomain
    ? emojiDomainPunycode
    : mainDomain;
  const targetDomainPunycodeWWW = useEmojiDomain
    ? emojiDomainPunycodeWWW
    : mainDomainWWW;

  console.log("targetDomain pre", targetDomain);
  console.log("hostHeaders pre", hostHeaders);
  console.log("targetUrl pre", targetUrl);

  // rewrite only if targetUrl is not the same as the current
  if (
    targetDomain === hostHeaders ||
    targetDomainWWW === hostHeaders ||
    targetDomainPunycode === hostHeaders ||
    targetDomainPunycodeWWW === hostHeaders
  ) {
    console.log("targetUrl is the same as the current");
    return;
  }

  console.log("targetDomain", targetDomain);
  console.log("hostHeaders", hostHeaders);
  console.log("targetUrl", targetUrl);
  return NextResponse.redirect(new URL(pathname, targetUrl));
}

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
