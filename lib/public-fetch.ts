// FETCH THE PUBLIC INTERNET, and only it. A server that fetches an address a stranger
// named (a live link preview, whether a page frames) is a door into the network it
// runs in: `http://169.254.169.254/` is the cloud's metadata service, `localhost` the
// server itself, `10.0.0.5` a machine nobody outside can reach. `publicFetch` refuses
// them all: http and https only, and every address the name resolves to must be
// public. It follows redirects itself (at most `REDIRECTS`) and checks each hop again,
// since a public page answering 302 to `http://127.0.0.1/` is the same request one
// step later.
//
// The check that counts is made where the connection is: undici's own fetch, its
// connections resolving names through `publicLookup`, so the address checked is the
// address connected to. A check made only before the fetch, with a resolve again
// inside it, let a name server answer public the first time and private the second
// (DNS rebinding); in Node there is one resolve that connects, and it is the checked
// one. The names are also checked before the request (`assertPublic`): Bun replaces
// the undici package with its own, which ignores a dispatcher, so there that early
// check is the one that holds (everything but a rebinding name server, measured
// 2026-10-16). An address written as an IP is no lookup at all, checked there too.
//
// Server-only: it connects with node:net and resolves with node:dns, which a
// browser has not.

import { type LookupAddress, lookup } from "node:dns"
import { lookup as resolve } from "node:dns/promises"
import { BlockList, isIP, type LookupFunction } from "node:net"
import { Agent, fetch as connect } from "undici"

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

/** A name resolved as a connection resolves it, refused where any address it has
 *  is not public: the lookup every connection of `publicFetch` makes, so what it
 *  checks is what it connects to. */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, found) => {
    const addresses = found as unknown as LookupAddress[]
    if (error) return callback(error, "", 0)
    const inside = addresses.find((a) => !isPublicAddress(a.address))
    if (inside)
      return callback(
        new Error(`${hostname} is ${inside.address}, not a public address`),
        "",
        0,
      )
    if (options.all) return callback(null, addresses as never)
    const [first] = addresses
    if (!first) return callback(new Error(`${hostname} has no address`), "", 0)
    callback(null, first.address, first.family)
  })
}

/** The connections `publicFetch` makes: every name through `publicLookup`. */
const PUBLIC = new Agent({ connect: { lookup: publicLookup } })

/** THROWS unless `url` is http(s) and its host is public: an IP as written (no
 *  lookup will see it), a name by every address it resolves to now. In Node the
 *  connection checks the name again, the resolve it connects with
 *  (`publicLookup`); in Bun this is the check. */
async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error(`publicFetch ${url.href}: ${url.protocol} is not http(s)`)
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1")
  const addresses = isIP(host)
    ? [host]
    : (await resolve(host, { all: true })).map((a) => a.address)
  const inside = addresses.find((a) => !isPublicAddress(a))
  if (inside)
    throw new Error(
      `publicFetch ${url.href}: ${host === inside ? host : `${host} is ${inside}`}, not a public address`,
    )
}

/** `fetch`, refused anywhere but the public internet: every hop's address checked
 *  as it connects, redirects followed here. THROWS on a refused address, a scheme
 *  other than http(s), or more than `REDIRECTS` redirects. The response's `url` is
 *  the last hop's, as a followed fetch's is. */
export async function publicFetch(
  url: string | URL,
  init: Omit<RequestInit, "redirect"> = {},
): Promise<Response> {
  let at = new URL(url)
  for (let hop = 0; hop <= REDIRECTS; hop++) {
    await assertPublic(at)
    const res = (await connect(at, {
      ...(init as object),
      redirect: "manual",
      dispatcher: PUBLIC,
    }).catch((error: Error) => {
      // A refused address surfaces as the connection's cause: said as the
      // fetch's own reason.
      const cause = (error as { cause?: Error }).cause
      throw new Error(
        `publicFetch ${at.href}: ${cause?.message ?? error.message}`,
      )
    })) as unknown as Response
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
