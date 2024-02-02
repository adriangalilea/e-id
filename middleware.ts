import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostHeaders = request.headers.get("host") ?? "";

   const localhost = "localhost:3000";

  // list of domains
  const shortDomain = "eid.to";
  const mainDomain = "e-id.to";
  const emojiDomain = "👤.to";

  // list https url's
  const shortHttps = `https://${shortDomain}`;
  const mainHttps = `https://${mainDomain}`;
  const emojiHttps = `https://${emojiDomain}`;

  // if the request is localhost, do nothing
  if (hostHeaders === localhost) {
    console.log("request url is localhost");
    return;
  }

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

  // rewrite only if targetUrl is not the same as the current
  if (targetDomain === hostHeaders) {
    console.log("targetUrl is the same as the current");
    return;
  }
  console.log("targetDomain", targetDomain);
  console.log("hostHeaders", hostHeaders);
  console.log("targetUrl", targetUrl);
  return NextResponse.rewrite(new URL(pathname, targetUrl));
}
