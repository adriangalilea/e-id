import "server-only"

// HOW OFTEN ONE CALLER MAY ASK, in this server's memory: a window of times per key,
// nothing stored anywhere, gone when the server is. For what costs e-ID something
// per call and is open to anyone (the home's live preview fetches the websites a
// visitor types). Each server instance counts on its own, so a caller spread across
// many is held per instance, not in all: a brake on one visitor, not a wall.

/** The callers this server remembers at most: past it the oldest is forgotten. */
const MOST_KEYS = 10_000

const seen = new Map<string, number[]>()

/** Whether `key` may make one more call now: fewer than `most` in the last
 *  `windowMs`. Counted when allowed, never when refused. */
export function allowed(
  key: string,
  most: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const recent = (seen.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= most) {
    seen.set(key, recent)
    return false
  }
  recent.push(now)
  seen.delete(key)
  seen.set(key, recent)
  if (seen.size > MOST_KEYS) {
    const oldest = seen.keys().next().value
    if (oldest !== undefined) seen.delete(oldest)
  }
  return true
}

/** Who is calling, as the request's network says: Vercel's real client address,
 *  else the first a proxy forwarded. Held in memory to count, never stored. */
export function callerOf(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}
