import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { CommandName } from "./commands"

// THE AGENT SKILL FOR eid (Claude Code's SKILL.md), printed by the eid it
// describes and never kept anywhere else, so it cannot fall behind: `eid skill`
// prints it, `eid skill install` writes it, and every later run of an eid whose
// version differs writes it again (`refreshSkill`). Progressive disclosure: the
// skill holds what an agent needs to start and the rules it must keep; every
// flag is `eid help <command>`, asked of the binary itself, so no reference
// copy exists to go stale. The commands it names are typed by the table
// (commands.ts), so naming one eid lacks does not build.

export const SKILL_DIR = join(homedir(), ".claude", "skills", "eid")

const MARK = (version: string) =>
  `<!-- eid ${version}: written by \`eid skill install\` and rewritten by every newer eid. An edit here is lost. -->`
const MARKED = /<!-- eid (\S+): written by `eid skill install`/

/** The commands the skill's words name: typed, so each is one eid has. */
export const SHOWN: readonly (CommandName | "help")[] = [
  "whoami",
  "login",
  "help",
  "link",
  "send",
  "get",
  "ls",
  "rm",
  "card",
  "set",
  "stats",
]

export function skill(version: string): string {
  return `---
name: eid
description: Use the eid CLI for e-ID (👤.to, eid.to, e-id.to), one page for everywhere a person is online. Make a short link to anything (one that expires or opens once included), send a file straight from this machine or get one someone is sending (eid get eid.to/name/file, no account needed), edit the user's card, read anyone's card, see a page's visits. Use when the user wants a short link, to send or receive a file, mentions eid.to, e-id.to or 👤.to, or asks about their e-ID.
---
${MARK(version)}

# eid

e-ID is one page for everywhere a person is online: \`eid.to/<username>\`, the same page at \`e-id.to\` and \`👤.to\`. \`eid\` is its CLI: short links under that page, and what the page holds.

## Start here

1. Run \`eid whoami\`. Not signed in: run \`eid login\`. It prints a code and opens the browser; ask the user to approve it there (one press, an account is made if they have none), and wait: it finishes on its own.
2. \`eid help\` lists every command, \`eid help <command>\` gives one in full. Read it before using a command or a flag not shown below: this file stays short on purpose, and the help is always the installed eid's own.

## Doing things

- A short link: \`eid link <url> [name]\` prints \`https://eid.to/<you>/<name>\` and copies it. Opens once: \`--opens 1\`. Stops on a day: \`--until 7d\`.
- Send a file or folder: \`eid send <path> [name]\` prints \`npx @e-id/eid get eid.to/<you>/<name>\` for whoever gets it, and serves until stopped (run it in the background; stopping it ends the send). Get one: \`eid get <address>\` (\`--dir\` for where).
- The user's short links and sends: \`eid ls\`. Delete one: \`eid rm <name>\`.
- The user's card: \`eid set name|bio|country|vouches <value>\`, \`eid set <platform> <handle>\`, \`eid unset <platform>\`. Anyone's card: \`eid card <username>\`. The user's numbers: \`eid stats\`.

## Reading the answers

Add \`--json\` whenever you read the answer yourself: stdout is then JSON alone (progress and notices go to stderr), the API's own shapes (\`eid help <command>\` says which; all of them in e-id.to/api/v1/openapi.json). A failure is \`{ "error": { "code", "message", "fields"? } }\` on stdout with exit 1; act on \`code\` (\`unauthorized\`: sign in; \`refused\`: say \`message\` to the user; \`slow_down\`: wait), never on the words. \`eid help --json\` is every command, its flags and its output, as data.

## Rules

- A short link is public: anyone with the address opens it, and it carries the user's name. Never shorten a URL that holds a secret (a token, a signed download link) without saying so first.
- e-ID refuses an address Google Safe Browsing lists, and a new account keeps few links. Tell the user the refusal in eid's own words; never work around it.
- An address handed to someone is copied whole, \`https://\` included: without it, \`👤.to\` is not a link. For X's website field, \`--on xn--mq8h.to\`: X refuses the emoji there and shows it back as 👤.to.
- A send goes straight between the two machines: where they connect directly, each sees the other's IP address. Tell the user before sending for them, and never get a file the user did not ask for.
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
