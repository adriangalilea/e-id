// THE HOME'S CAPTURES, AS CODE: every page the home's story shows as a picture,
// made by the ui registry's `mise capture` (its checkout, `$UI`) from this plan,
// into public/links/<handle>/ and lib/link-shots.json, which the home imports as
// it is (lib/link-shots). Run when the lead or their pages change, then commit:
//
//   pnpm captures                    (production, after it is deployed)
//   CAPTURE_SITE=http://localhost:3456 pnpm captures
//
// The lead is the home's (lib/data `getShowcase`, its first card); their links come
// from their card's own data (`/json`), the first of each platform, the one its
// route opens. Their profile is captured on a laptop and on a phone, the phone
// required to show the card's save (`card-save`), which the story presses: a page
// still deploying shows the old layout without it, and the run fails rather than
// keep it. A site that refuses a headless browser (X) is left out.
import assert from "node:assert/strict";
import type { CapturePlan, CaptureSpec } from "./lib/browser-capture";

/** Whose captures these are. */
export type LinkShotsMeta = { handle: string };

/** The home's lead: kept here, where the captures are made, and checked by the
 *  home against its own lead (a lead changed since shows their card alone). */
const LEAD = "adriangalilea";

export default async function plan(): Promise<CapturePlan<LinkShotsMeta>> {
  const site = process.env.CAPTURE_SITE ?? "https://e-id.to";
  const answer = await fetch(`${site}/${LEAD}/json`);
  assert.ok(answer.ok, `captures: ${site}/${LEAD}/json answered ${answer.status}`);
  const card = (await answer.json()) as {
    links: { platform: string; url: string }[];
  };
  assert.ok(Array.isArray(card.links), `captures: ${LEAD}'s card has no links`);
  const firsts = card.links.filter(
    (l, i) =>
      /^https?:/.test(l.url) &&
      card.links.findIndex((m) => m.platform === l.platform) === i,
  );
  const links: Record<string, CaptureSpec> = Object.fromEntries(
    firsts.map((l) => [l.platform, { url: l.url, optional: true }]),
  );
  return {
    folder: `public/links/${LEAD}`,
    manifest: "lib/link-shots.json",
    meta: { handle: LEAD },
    shots: {
      // The one link's own page, where the visit starts.
      profile: { url: `${site}/${LEAD}` },
      // The same page on a phone, where the vCard chapter saves it.
      phone: {
        url: `${site}/${LEAD}`,
        phone: true,
        find: { save: "[data-slot=card-save]" },
      },
      ...links,
    },
  };
}
