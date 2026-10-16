// WHAT IS PREPARED IS KEPT BY WHAT IT IS MADE FROM, so a build prepares only what
// changed: `make`'s result is a file under `dir` named by the hash of `parts` (the
// source's bytes, the options, the code that draws it: everything the result depends
// on) and of prepare-media's own recipe (its code and sharp's versions). Equal inputs,
// equal result: made once, read after. Never keyed by a file's date, which a fresh clone
// resets. A Next build keeps `.next/cache` and Vercel restores it before each deploy, so
// a `dir` under it lasts from deploy to deploy.
//
// A module of its own, for the build scripts that import it, never a page: its paths are
// the caller's, and a server module reading a path no bundler can scope makes Next trace
// the whole project into the function that imports it.

import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { RECIPE } from "@/lib/prepare-media"

export async function keep(
  dir: string,
  parts: readonly (string | Uint8Array)[],
  make: () => Promise<Uint8Array | string>,
  ext: string,
): Promise<{ path: string; made: boolean }> {
  const h = createHash("sha256").update(RECIPE)
  for (const p of parts) h.update(p).update("\0")
  const path = join(dir, `${h.digest("hex")}.${ext}`)
  const kept = await readFile(path).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false
      throw error
    },
  )
  if (kept) return { path, made: false }
  await mkdir(dir, { recursive: true })
  await writeFile(path, await make())
  return { path, made: true }
}

/** Removes from `dir` every file `keep` made that is not among `paths`: what nothing
 *  asked for this time. */
export async function keepOnly(dir: string, paths: Iterable<string>) {
  const used = new Set(paths)
  const names = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [] as string[]
    throw error
  })
  for (const name of names)
    if (!used.has(join(dir, name))) await rm(join(dir, name))
}
