import type { Threat } from "@/lib/threats"

// SAFE BROWSING'S ANSWER, READ (v5 `urls:search`): protocol buffers, the only
// form it answers in (`alt=json` is "Unsupported Output Format"). Two messages,
// read by hand rather than with a protobuf library for a dozen lines:
//
//   SearchUrlsResponse { repeated ThreatUrl threats = 1; Duration cache_duration = 2; }
//   ThreatUrl          { string url = 1; repeated ThreatType threat_types = 2; }
//
// `threat_types` arrives packed (one length-delimited run of varints), as it did
// in every answer read on 2026-10-16, or unpacked (one varint each); both are read.
// Any other field is skipped by its wire type, so a field Google adds later reads
// as nothing; a threat number this does not know throws, since a new kind of
// threat must be named before it is acted on.

/** ThreatType's numbers, as Google's own test pages answered them on 2026-10-16
 *  (testsafebrowsing.appspot.com/s/phishing.html: 2, malware.html: 1 and 4,
 *  unwanted.html: 3). */
const NUMBERED: Record<number, Threat> = {
  1: "MALWARE",
  2: "SOCIAL_ENGINEERING",
  3: "UNWANTED_SOFTWARE",
  4: "POTENTIALLY_HARMFUL_APPLICATION",
}

/** A varint at `at`: its value and where the next byte is. */
function varint(b: Uint8Array, at: number): [number, number] {
  let value = 0
  let shift = 0
  for (let i = at; i < b.length; i++) {
    const byte = b[i] as number
    value += (byte & 0x7f) * 2 ** shift
    if (byte < 0x80) return [value, i + 1]
    shift += 7
    if (shift > 49) throw new Error("Safe Browsing: a varint past 7 bytes")
  }
  throw new Error("Safe Browsing: the answer ends inside a varint")
}

type Field =
  | { n: number; wire: 0; value: number }
  | { n: number; wire: 2; from: number; to: number }

/** The fields of one message between `from` and `to`; fixed-width ones skipped. */
function* fields(b: Uint8Array, from: number, to: number): Generator<Field> {
  let at = from
  while (at < to) {
    const [tag, next] = varint(b, at)
    const n = Math.floor(tag / 8)
    const wire = tag % 8
    if (wire === 0) {
      const [value, after] = varint(b, next)
      yield { n, wire, value }
      at = after
    } else if (wire === 2) {
      const [length, start] = varint(b, next)
      if (start + length > to)
        throw new Error("Safe Browsing: a field runs past its message")
      yield { n, wire, from: start, to: start + length }
      at = start + length
    } else if (wire === 1) at = next + 8
    else if (wire === 5) at = next + 4
    else throw new Error(`Safe Browsing: wire type ${wire} in field ${n}`)
  }
  if (at !== to) throw new Error("Safe Browsing: a message ends mid-field")
}

function threatNamed(n: number): Threat {
  const threat = NUMBERED[n]
  if (!threat) throw new Error(`Safe Browsing: an unknown threat type ${n}`)
  return threat
}

/** Every threat type a `urls:search` answer names, in its order. Empty for an
 *  address listed under none. */
export function threatsIn(answer: Uint8Array): Threat[] {
  const found: Threat[] = []
  for (const threat of fields(answer, 0, answer.length)) {
    if (threat.n !== 1 || threat.wire !== 2) continue
    for (const f of fields(answer, threat.from, threat.to)) {
      if (f.n !== 2) continue
      if (f.wire === 0) found.push(threatNamed(f.value))
      else
        for (let at = f.from; at < f.to; ) {
          const [value, next] = varint(answer, at)
          found.push(threatNamed(value))
          at = next
        }
    }
  }
  return found
}
