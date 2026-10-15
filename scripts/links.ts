// A card's links as their pages really look, for the home's "one link" grid:
// each link that is a web page captured in the dark and the light scheme by the ui
// registry's `browser-shot` (most refuse to be framed live), into
// public/links/<handle>/, and the manifest the home reads (lib/link-shots.json).
// Run at authoring time when the home's lead or their pages change, then commit.
//
//   pnpm links adriangalilea
//   pnpm links adriangalilea http://localhost:3456   (a dev server's card)
//
// The links come from the card's own data (`/json`), so what is captured is what
// the home shows: the first of each platform, the one its route opens. An email
// has no page. A site that refuses a headless browser (X does) is said, and has
// no capture: the home leaves it out.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

type Size = { width: number; height: number };

async function main() {
  const [handle, site = "https://e-id.to"] = process.argv.slice(2);
  assert.ok(handle, "usage: pnpm links <handle> [site, https://e-id.to]");
  const ui = process.env.UI;
  assert.ok(
    ui,
    "links: UI is the ui registry's checkout (set in mise's config)",
  );

  const answer = await fetch(`${site}/${handle}/json`);
  assert.ok(
    answer.ok,
    `links: ${site}/${handle}/json answered ${answer.status}`,
  );
  const card = (await answer.json()) as {
    links: { platform: string; url: string }[];
  };
  assert.ok(Array.isArray(card.links), `links: ${handle}'s card has no links`);

  type Captured = { url: string; dark: Size; light: Size };
  const capture = (url: string, out: string): Captured => {
    execFileSync("bun", [`${ui}/scripts/browser-shot.ts`, url, out], {
      stdio: ["ignore", "inherit", "pipe"],
    });
    return JSON.parse(readFileSync(`${out}.json`, "utf8"));
  };
  // The one link's own page, where the visit starts: the profile as it is.
  const profile = capture(
    `${site}/${handle}`,
    `public/links/${handle}/profile`,
  );
  const shots: Record<string, Captured> = {};
  const refused: string[] = [];
  const firsts = card.links.filter(
    (l, i) => card.links.findIndex((m) => m.platform === l.platform) === i,
  );
  for (const { platform, url } of firsts) {
    if (!/^https?:/.test(url)) continue;
    const out = `public/links/${handle}/${platform}`;
    try {
      shots[platform] = capture(url, out);
    } catch (e) {
      // The capture's own first line says why: refused (X answers a headless
      // browser with an error), or a page too slow this once (run it again).
      const why =
        String((e as { stderr?: Buffer }).stderr ?? "")
          .split("\n")
          .find((l) => /Error:|answered/.test(l))
          ?.trim() ?? "no reason given";
      refused.push(`${platform} (${url}): ${why}`);
    }
  }
  writeFileSync(
    "lib/link-shots.json",
    `${JSON.stringify({ handle, profile, shots }, null, 2)}\n`,
  );
  console.log(`lib/link-shots.json: ${Object.keys(shots).join(", ")}`);
  for (const r of refused) console.log(`no capture: ${r}`);
}

void main();
