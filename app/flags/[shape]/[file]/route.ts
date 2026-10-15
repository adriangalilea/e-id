// THE FLAGS, SERVED: every flag country-flag-icons draws, as its own SVG file at
// `/flags/<shape>/<CODE>.svg` (`3x2`, `1x1`), for `Flag` to show as an image. Read
// from the installed package, prerendered for every flag at build, so the CDN
// serves them and no function runs; nothing is copied into the site. Installed at
// app/flags/[shape]/[file]/route.ts.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { countries } from "country-flag-icons"

const SHAPES = ["3x2", "1x1"] as const

/** The package's folder: a dependency of the site's own, so at its root (a
 *  bundler's module resolution is no file path: Turbopack's is virtual). Read at
 *  build, when every flag is prerendered. */
const root = join(process.cwd(), "node_modules/country-flag-icons")

export function generateStaticParams() {
  return SHAPES.flatMap((shape) =>
    countries.map((code) => ({ shape, file: `${code}.svg` })),
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shape: string; file: string }> },
) {
  const { shape, file } = await params
  const code = file.replace(/\.svg$/, "")
  if (
    !(SHAPES as readonly string[]).includes(shape) ||
    !countries.includes(code)
  )
    return new Response("no such flag", { status: 404 })
  // Read at once, never awaited: under Cache Components an awaited read is I/O
  // that makes the route dynamic (a function per flag), and "use cache" exists
  // only there. A file the size of a flag costs nothing to read in step.
  const svg = readFileSync(join(root, shape, `${code}.svg`), "utf8")
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  })
}
