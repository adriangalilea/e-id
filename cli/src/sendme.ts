import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// N0'S SENDME, FETCHED AND CHECKED (README, To do › the CLI › 2): what `eid send`
// and `eid get` move files with, peer to peer over iroh, BLAKE3-verified. Not
// rebuilt here: n0 maintains it. One version, pinned, each platform's release
// build checked against the SHA-256 GitHub published for it, so a build that is
// not the one reviewed never runs; kept in $XDG_CACHE_HOME/eid. A new sendme is a
// new VERSION and its digests (`gh release view <tag> -R n0-computer/sendme
// --json assets`), nothing else.

export const SENDME_VERSION = "v0.36.1"

/** Each platform's build of SENDME_VERSION, by `${process.platform}-${process.arch}`. */
const BUILDS: Record<string, { file: string; sha256: string }> = {
  "darwin-arm64": {
    file: "sendme-v0.36.1-darwin-aarch64.tar.gz",
    sha256: "c03c8860726195198edb97d380f599a47a14e98b5f7b6fdc69d2e0372119454d",
  },
  "darwin-x64": {
    file: "sendme-v0.36.1-darwin-x86_64.tar.gz",
    sha256: "b82e63fbf583e9a558aa9c8a202952f68aa7e2bff76a3cea80b2c46a5d9fffdf",
  },
  "linux-arm64": {
    file: "sendme-v0.36.1-linux-aarch64.tar.gz",
    sha256: "902a2de78f7c5b96ddc52157a81e81e10d75c4cd8c7a83ff92e6407b69875bd2",
  },
  "linux-x64": {
    file: "sendme-v0.36.1-linux-x86_64.tar.gz",
    sha256: "2453a8dcc0e31c67311eb2daa8901864a667e575b9bee74abb1040f697d38541",
  },
  "win32-x64": {
    file: "sendme-v0.36.1-windows-x86_64.zip",
    sha256: "c5b4c30813c65df51ebc3276d9f4f0cd9a7b1a371b081d80b12587eb558acbcb",
  },
}

const DIR = join(
  process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
  "eid",
  `sendme-${SENDME_VERSION}`,
)

/** Where sendme is on this machine, fetched and checked first where it is not.
 *  `fetching` is told before a download, for a person to see why they wait. */
export async function sendme(fetching: () => void): Promise<string> {
  const binary = join(
    DIR,
    process.platform === "win32" ? "sendme.exe" : "sendme",
  )
  if (existsSync(binary)) return binary
  const key = `${process.platform}-${process.arch}`
  const build = BUILDS[key]
  if (!build)
    throw new Error(
      `sendme has no build for ${key}: sending needs macOS, Linux or Windows on x64 or arm64 (Windows: x64)`,
    )
  fetching()
  const url = `https://github.com/n0-computer/sendme/releases/download/${SENDME_VERSION}/${build.file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetching sendme: ${url}: HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const got = createHash("sha256").update(bytes).digest("hex")
  if (got !== build.sha256)
    throw new Error(
      `sendme ${build.file} is not the build e-ID checked (sha256 ${got}, expected ${build.sha256}): not run`,
    )
  mkdirSync(DIR, { recursive: true })
  const archive = join(DIR, build.file)
  writeFileSync(archive, bytes)
  // tar reads both: a .tar.gz, and on Windows (bsdtar, since 10) the .zip.
  execFileSync("tar", ["-xf", archive, "-C", DIR])
  rmSync(archive)
  if (!existsSync(binary))
    throw new Error(`sendme ${build.file} has no ${binary} in it`)
  if (process.platform !== "win32") chmodSync(binary, 0o755)
  return binary
}
