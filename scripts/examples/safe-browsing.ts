// Safe Browsing's answer read (lib/safe-browsing-wire), then asked for real
// (lib/safe-browsing): Google's own test pages, each listed under what it is
// named for, and a clean page listed under nothing. The recorded answers are
// bytes Google sent on 2026-10-16; a change in how it answers throws here.
//
//   SAFE_BROWSING_KEY=$(op read "op://Private/Google Safe Browsing API key (e-ID)/credential") \
//     bun --conditions=react-server scripts/examples/safe-browsing.ts
import assert from "node:assert/strict"
import { threatOf } from "@/lib/safe-browsing"
import { threatsIn } from "@/lib/safe-browsing-wire"

const hex = (h: string) => Uint8Array.from(Buffer.from(h, "hex"))

const RECORDED = {
  phishing: [
    "0a310a2c746573747361666562726f7773696e672e61707073706f742e636f6d2f732f7068697368696e672e68746d6c120102120308ac02",
    ["SOCIAL_ENGINEERING"],
  ],
  malware: [
    "0a310a2b746573747361666562726f7773696e672e61707073706f742e636f6d2f732f6d616c776172652e68746d6c12020104120308ac02",
    ["MALWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
  ],
  unwanted: [
    "0a310a2c746573747361666562726f7773696e672e61707073706f742e636f6d2f732f756e77616e7465642e68746d6c120103120308ac02",
    ["UNWANTED_SOFTWARE"],
  ],
  clean: ["120308ac02", []],
} as const

for (const [name, [bytes, threats]] of Object.entries(RECORDED)) {
  assert.deepEqual(threatsIn(hex(bytes)), threats, name)
  console.log(`recorded ${name}: ${threats.join(", ") || "nothing"}`)
}
// One ThreatUrl (field 1, 3 bytes) naming threat type 9, which nobody named.
assert.throws(() => threatsIn(hex("0a03120109")), /unknown threat type 9/)
// Unpacked (field 2 as a lone varint) reads the same as packed.
assert.deepEqual(threatsIn(hex("0a021002")), ["SOCIAL_ENGINEERING"])

if (!process.env.SAFE_BROWSING_KEY) {
  console.log("SAFE_BROWSING_KEY unset: the live questions were not asked")
  process.exit(0)
}
const TEST = "http://testsafebrowsing.appspot.com/s"
const LIVE = [
  [`${TEST}/phishing.html`, "SOCIAL_ENGINEERING"],
  [`${TEST}/malware.html`, "MALWARE"],
  [`${TEST}/unwanted.html`, "UNWANTED_SOFTWARE"],
  ["https://worrydream.com/", null],
] as const
for (const [url, expected] of LIVE) {
  const threat = await threatOf(url)
  assert.equal(threat, expected, url)
  console.log(`live ${url}: ${threat ?? "nothing"}`)
}
