import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { COMMANDS } from "./commands"

// THE AGENT SKILL FOR eid (Claude Code's SKILL.md), printed by the eid it
// describes and never kept anywhere else, so it cannot fall behind: `eid skill`
// prints it, `eid skill install` writes it, and every later run of an eid whose
// version differs writes it again (`refreshSkill`). Progressive disclosure: the
// skill holds what an agent needs to start and the rules it must keep; every
// flag is `eid help <command>`, asked of the binary itself, so no reference
// copy exists to go stale. The commands it names are checked against the table
// (commands.ts) when it is printed.

export const SKILL_DIR = join(homedir(), ".claude", "skills", "eid")

const MARK = (version: string) =>
  `<!-- eid ${version}: written by \`eid skill install\` and rewritten by every newer eid. An edit here is lost. -->`
const MARKED = /<!-- eid (\S+): written by `eid skill install`/

/** The commands the skill shows by name: each must be one eid has. */
const SHOWN = ["whoami", "login", "help", "link", "ls", "rm", "card", "stats"]

export function skill(version: string): string {
  for (const name of SHOWN)
    if (!COMMANDS.some((c) => c.name === name))
      throw new Error(`the skill names eid ${name}, which eid ${version} lacks`)
  return `---
name: eid
description: Use the eid CLI for e-ID (👤.to, eid.to, e-id.to), one page for everywhere a person is online. Make a short link to anything (one that expires or opens once included), list or delete short links, read anyone's e-ID card, see a page's visits. Use when the user wants a short link, mentions eid.to, e-id.to or 👤.to, or asks about their e-ID.
---
${MARK(version)}

# eid

e-ID is one page for everywhere a person is online: \`eid.to/<username>\`, the same page at \`e-id.to\` and \`👤.to\`. \`eid\` is its CLI: short links under that page, and what the page holds.

## Start here

1. Run \`eid whoami\`. Not signed in: run \`eid login\`. It prints a code and opens the browser; ask the user to approve it there (one press, an account is made if they have none), and wait: it finishes on its own.
2. \`eid help\` lists every command, \`eid help <command>\` gives one in full. Read it before using a command or a flag not shown below: this file stays short on purpose, and the help is always the installed eid's own.

## Doing things

- A short link: \`eid link <url> [name]\` prints \`https://eid.to/<you>/<name>\` and copies it. Opens once: \`--opens 1\`. Stops on a day: \`--until 7d\`.
- The user's short links: \`eid ls\`. Delete one: \`eid rm <name>\`.
- Anyone's card: \`eid card <username>\`. The user's numbers: \`eid stats\`.
- Add \`--json\` whenever you read the answer yourself.

## Rules

- A short link is public: anyone with the address opens it, and it carries the user's name. Never shorten a URL that holds a secret (a token, a signed download link) without saying so first.
- e-ID refuses an address Google Safe Browsing lists, and a new account keeps few links. Tell the user the refusal in eid's own words; never work around it.
- An address handed to someone is copied whole, \`https://\` included: without it, \`👤.to\` is not a link. For X's website field, \`--on xn--mq8h.to\`: X refuses the emoji there and shows it back as 👤.to.
`
}

/** Writes the skill into `dir`; where it went. */
export function installSkill(version: string, dir = SKILL_DIR): string {
  const file = join(dir, "SKILL.md")
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, skill(version))
  return file
}

/** An installed skill written by another eid, written again by this one.
 *  Nothing where none is installed: installing is the person's choice. */
export function refreshSkill(version: string): void {
  const file = join(SKILL_DIR, "SKILL.md")
  if (!existsSync(file)) return
  const was = MARKED.exec(readFileSync(file, "utf8"))?.[1]
  // A SKILL.md eid did not write is the person's own: left alone.
  if (!was || was === version) return
  writeFileSync(file, skill(version))
}
