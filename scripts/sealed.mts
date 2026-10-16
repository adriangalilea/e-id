// SEALED: what a public repository must not publish, committed encrypted. A file is
// sealed when its first line says it belongs to an @ag paid or studio item
// (`/* @ag/<name> is a paid item: …` or `… is a studio item: …`), so the list of what
// to seal is never kept: it is read off the files. Each one is committed beside itself
// as `<file>.sealed` (AES-256-GCM, its path bound in, so a sealed file moved elsewhere
// does not open), its own path is ignored by git in a block this script writes into
// .gitignore, and the build opens them where the key is.
//
//   node --experimental-strip-types scripts/sealed.mts seal    after installing or editing
//   node --experimental-strip-types scripts/sealed.mts open    before the build (the deploy)
//   node --experimental-strip-types scripts/sealed.mts check   in the repo's check
//
// The key is SEALED_KEY, 32 random bytes in base64 (`openssl rand -base64 32`), held
// where the build runs, never committed; `seal` asks for it only when a file changed,
// `check` never (it compares hashes). A clone without it builds nothing that imports a
// sealed file: those files are not part of the repository's source. Plain Node, no
// dependencies.

import { execFileSync } from "node:child_process"
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { join, relative } from "node:path"

const root = process.cwd()
const verb = process.argv[2]
if (verb !== "seal" && verb !== "open" && verb !== "check")
  throw new Error("usage: node scripts/sealed.mts seal | open | check")

const SUFFIX = ".sealed"
const MAGIC = "@ag/sealed v1"
const NOTICE = /^\/\* @ag\/[a-z0-9-]+ is a (paid|studio) item: /
const SKIP = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  "dist",
  "out",
])
const BEGIN =
  "# @ag/sealed: committed encrypted beside themselves (scripts/sealed.mts)"
const END = "# end @ag/sealed"

/** Every file under the repository, as a path relative to it, build output skipped. */
function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield relative(root, p)
  }
}
const all = [...walk(root)]
/** The files that must be sealed, read off their first line. */
const plain = all.filter(
  (p) =>
    /\.(tsx?|mts|css)$/.test(p) &&
    NOTICE.test(readFileSync(join(root, p), "utf8").slice(0, 200)),
)
/** Their sealed copies present, by the path they open to. */
const sealed = all
  .filter((p) => p.endsWith(SUFFIX))
  .map((p) => p.slice(0, -SUFFIX.length))

const key = (): Buffer => {
  const value = process.env.SEALED_KEY
  if (!value)
    throw new Error(
      `${sealed.length} sealed files and no SEALED_KEY: set it to the repository's key (32 bytes, base64)`,
    )
  const bytes = Buffer.from(value, "base64")
  if (bytes.length !== 32)
    throw new Error(`SEALED_KEY is ${bytes.length} bytes, not 32`)
  return bytes
}

// A sealed file is two lines: the format and the plain file's SHA-256, which says
// whether a copy is current without the key (a hash of source reveals none of it), then
// the nonce, tag and ciphertext.
const sha = (text: string) => createHash("sha256").update(text).digest("hex")
const seal = (path: string, text: string, k: Buffer): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", k, iv)
  cipher.setAAD(Buffer.from(path))
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  return `${MAGIC} ${sha(text)}\n${[iv, cipher.getAuthTag(), body].map((b) => b.toString("base64")).join(".")}\n`
}
/** The SHA-256 a sealed copy says its file has. */
const shaOf = (path: string): string => {
  const head =
    readFileSync(join(root, path + SUFFIX), "utf8").split("\n")[0] ?? ""
  const m = new RegExp(`^${MAGIC} ([0-9a-f]{64})$`).exec(head)
  if (!m?.[1]) throw new Error(`${path}${SUFFIX}: not a sealed file`)
  return m[1]
}
const unseal = (path: string, k: Buffer): string => {
  const payload = readFileSync(join(root, path + SUFFIX), "utf8").split("\n")[1]
  const [iv, tag, body] = (payload ?? "")
    .split(".")
    .map((s) => Buffer.from(s, "base64"))
  if (!iv || !tag || !body) throw new Error(`${path}${SUFFIX}: truncated`)
  const decipher = createDecipheriv("aes-256-gcm", k, iv)
  decipher.setAAD(Buffer.from(path))
  decipher.setAuthTag(tag)
  let text: string
  try {
    text = Buffer.concat([decipher.update(body), decipher.final()]).toString(
      "utf8",
    )
  } catch (cause) {
    throw new Error(
      `${path}${SUFFIX}: does not open with this SEALED_KEY (a wrong key, or a sealed file moved from where it was sealed)`,
      { cause },
    )
  }
  if (sha(text) !== shaOf(path))
    throw new Error(`${path}${SUFFIX}: opens to other bytes than its hash`)
  return text
}

/** .gitignore with its sealed block naming exactly these paths. */
const ignoreWith = (paths: string[]): string => {
  const file = join(root, ".gitignore")
  const text = existsSync(file) ? readFileSync(file, "utf8") : ""
  const start = text.indexOf(BEGIN)
  const end = text.indexOf(END)
  if ((start === -1) !== (end === -1) || end < start)
    throw new Error(
      ".gitignore: the @ag/sealed block is broken; fix its markers by hand",
    )
  const block = [BEGIN, ...paths.toSorted().map((p) => `/${p}`), END].join("\n")
  if (start === -1) return `${text.replace(/\n*$/, "\n\n")}${block}\n`
  return text.slice(0, start) + block + text.slice(end + END.length)
}
const tracked = (path: string): boolean => {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", path], {
      cwd: root,
      stdio: "ignore",
    })
    return true
  } catch {
    return false
  }
}

if (verb === "open") {
  if (sealed.length === 0) {
    console.log("sealed: nothing to open")
    process.exit(0)
  }
  const k = key()
  for (const p of sealed) writeFileSync(join(root, p), unseal(p, k))
  console.log(`sealed: opened ${sealed.length} (${sealed.join(", ")})`)
  process.exit(0)
}

const orphans = sealed.filter((p) => !plain.includes(p))
if (verb === "seal") {
  // Unchanged files keep their sealed copy byte for byte (a fresh nonce would make
  // every seal a diff), and only a changed one needs the key.
  const changed = plain.filter(
    (p) =>
      !sealed.includes(p) ||
      shaOf(p) !== sha(readFileSync(join(root, p), "utf8")),
  )
  if (changed.length) {
    const k = key()
    for (const p of changed)
      writeFileSync(
        join(root, p + SUFFIX),
        seal(p, readFileSync(join(root, p), "utf8"), k),
      )
  }
  const wrote = changed.length
  writeFileSync(join(root, ".gitignore"), ignoreWith(plain))
  const stillTracked = plain.filter(tracked)
  console.log(
    `sealed: ${plain.length} files, ${wrote} sealed anew, .gitignore's block current`,
  )
  if (stillTracked.length)
    console.log(
      `untrack them, their sealed copies replace them: git rm --cached ${stillTracked.join(" ")}`,
    )
  if (orphans.length)
    console.log(
      `sealed copies of files no longer here (trash them if the file is gone for good): ${orphans.map((p) => p + SUFFIX).join(" ")}`,
    )
  process.exit(0)
}

// check: what a push must not carry, a file published or a sealed copy gone stale.
const failures: string[] = []
const gitignore = existsSync(join(root, ".gitignore"))
  ? readFileSync(join(root, ".gitignore"), "utf8")
  : ""
if (plain.length && ignoreWith(plain) !== gitignore)
  failures.push(
    ".gitignore's @ag/sealed block does not name exactly the files to seal: run seal",
  )
for (const p of plain) {
  if (tracked(p))
    failures.push(`${p}: tracked by git, so published (git rm --cached ${p})`)
  if (!sealed.includes(p)) failures.push(`${p}: no sealed copy: run seal`)
}
for (const p of orphans)
  failures.push(
    existsSync(join(root, p))
      ? `${p}${SUFFIX}: its file no longer opens with an @ag tier's line`
      : `${p}${SUFFIX}: sealed but not opened here: run open`,
  )
for (const p of plain)
  if (
    sealed.includes(p) &&
    shaOf(p) !== sha(readFileSync(join(root, p), "utf8"))
  )
    failures.push(`${p}: changed since it was sealed: run seal`)
if (failures.length) {
  for (const f of failures) console.error(`✗ ${f}`)
  process.exit(1)
}
console.log(
  `✓ sealed: ${plain.length} files kept out of git, every sealed copy current`,
)
