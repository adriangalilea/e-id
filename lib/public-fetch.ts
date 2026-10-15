import { lookup } from "node:dns/promises"
import { BlockList, isIP } from "node:net"

/** Redirects followed before the fetch gives up. */
const REDIRECTS = 5

/** Every range that is not the public internet (IANA special-purpose registries):
 *  this host, private networks, shared and link-local space (the metadata service),
 *  documentation and benchmark ranges, multicast, reserved. An IPv4-mapped IPv6
 *  address (`::ffff:127.0.0.1`) is checked against the IPv4 ranges. */
const NOT_PUBLIC = new BlockList()
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  NOT_PUBLIC.addSubnet(net, bits, "ipv4")
for (const [net, bits] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  NOT_PUBLIC.addSubnet(net, bits, "ipv6")

/** Whether an IP address is on the public internet. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0)
    throw new Error(`isPublicAddress: ${address} is no IP address`)
  return !NOT_PUBLIC.check(address, family === 4 ? "ipv4" : "ipv6")
}

/** THROWS unless `url` is http(s) and every address its host resolves to is public. */
async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error(`publicFetch ${url.href}: ${url.protocol} is not http(s)`)
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address)
  const inside = addresses.find((a) => !isPublicAddress(a))
  if (inside)
    throw new Error(
      `publicFetch ${url.href}: ${host === inside ? host : `${host} is ${inside}`}, not a public address`,
    )
}

/** `fetch`, refused anywhere but the public internet: every hop's host checked
 *  before it is asked, redirects followed here. THROWS on a refused address, a
 *  scheme other than http(s), or more than `REDIRECTS` redirects. The response's
 *  `url` is the last hop's, as a followed fetch's is. */
export async function publicFetch(
  url: string | URL,
  init: Omit<RequestInit, "redirect"> = {},
): Promise<Response> {
  let at = new URL(url)
  for (let hop = 0; hop <= REDIRECTS; hop++) {
    await assertPublic(at)
    const res = await fetch(at, { ...init, redirect: "manual" })
    const to = res.headers.get("location")
    if (res.status < 300 || res.status > 399 || !to) return res
    // Read, never cancelled: a redirect's body is a line, and Next's fetch inside
    // a `"use cache"` function tees each body to keep it, so one branch cancelled
    // left the other waiting and the prerender stalled until it timed out.
    await res.arrayBuffer()
    at = new URL(to, at)
  }
  throw new Error(`publicFetch ${url}: more than ${REDIRECTS} redirects`)
}
