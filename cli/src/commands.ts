// EVERY COMMAND eid HAS, as data: the one source `eid --help`, `eid help
// <command>` and the agent skill (skill.ts) are printed from, and the table the
// dispatcher (eid.ts) must answer in full, so a command cannot exist without its
// words or its words without the command (`Runners`, a type error either way).

export type Flag = { flag: string; says: string }

export type Command = {
  name: string
  /** How it is typed, after `eid `. */
  usage: string
  /** One line: what it does, in the person's words. */
  says: string
  flags?: Flag[]
  /** What `eid help <command>` adds: how it behaves, what it refuses. */
  more?: string
  examples?: string[]
}

/** Every command the dispatcher answers, by name. */
export type CommandName = (typeof COMMANDS)[number]["name"]

export const COMMANDS = [
  {
    name: "login",
    usage: "login",
    says: "sign this machine in, with GitHub or Google",
    flags: [
      { flag: "--no-browser", says: "print the address instead of opening it" },
    ],
    more: "Shows a code and opens e-id.to/cli, where you approve it signed in (an account is made then if you have none). The machine keeps a key at ~/.config/eid/config.json, revocable at e-id.to/cli. Over ssh the address is printed, never opened. Any command that needs you signed in offers this first.",
  },
  {
    name: "logout",
    usage: "logout",
    says: "sign this machine out, revoking its key",
  },
  {
    name: "whoami",
    usage: "whoami",
    says: "who you are, and your address on every domain",
  },
  {
    name: "link",
    usage: "link <url> [name]",
    says: "a short link to <url> at /you/<name>, printed and copied",
    flags: [
      {
        flag: "--until <day|Nd>",
        says: "the last day it opens: 2026-12-31, or 7d",
      },
      { flag: "--opens <n>", says: "how many times it opens (1: one use)" },
      { flag: "--card <label>", says: "on your card too, named <label>" },
      {
        flag: "--on <domain>",
        says: "the domain printed: eid.to (default), e-id.to, 👤.to, xn--mq8h.to",
      },
    ],
    more: "Without a name it gets a made-up code (six letters and digits). Refused where Google Safe Browsing lists the address, past what your account may keep (a new account keeps one, more as it ages: eid ls says when), or at a name you already use. A link that stops (--until, --opens) is never on your card.",
    examples: [
      "eid link https://example.com/cv.pdf cv",
      "eid link https://example.com/notes.zip --opens 1",
      "eid link https://example.com/talk talk --until 7d --on 👤.to",
    ],
  },
  {
    name: "ls",
    usage: "ls",
    says: "your short links, and how many you may keep",
  },
  {
    name: "rm",
    usage: "rm <name>",
    says: "delete one of your short links",
    more: "It opens nothing from then on, and its name is free for another of yours.",
  },
  {
    name: "stats",
    usage: "stats",
    says: "your numbers: visits to your page, links opened",
  },
  {
    name: "card",
    usage: "card [username]",
    says: "a card as text, yours without a name",
    examples: ["eid card", "eid card adrian"],
  },
  {
    name: "skill",
    usage: "skill [install]",
    says: "the agent skill for eid: printed, or installed for Claude Code",
    flags: [
      {
        flag: "--dir <path>",
        says: "where to install it (default ~/.claude/skills/eid)",
      },
    ],
    more: "Printed from this eid, so it describes exactly the eid installed. Once installed, every run of a newer eid rewrites it, so it never falls behind.",
  },
  {
    name: "help",
    usage: "help [command]",
    says: "these words, or one command's in full",
  },
] as const satisfies readonly Command[]

/** Shared by every command. */
export const GLOBAL: Flag[] = [
  { flag: "--json", says: "the answer as JSON, for scripts and agents" },
  { flag: "--version", says: "this eid's version" },
]

export const commandNamed = (name: string): Command | undefined =>
  (COMMANDS as readonly Command[]).find((c) => c.name === name)

const pad = (s: string, n: number) => s + " ".repeat(Math.max(1, n - s.length))

/** `eid --help`: every command on a line. */
export function overview(version: string): string {
  const width = Math.max(...COMMANDS.map((c) => c.usage.length)) + 6
  return [
    `eid ${version}: your e-ID from a terminal`,
    "",
    ...COMMANDS.map((c) => `  ${pad(`eid ${c.usage}`, width)}${c.says}`),
    "",
    ...GLOBAL.map((f) => `  ${pad(f.flag, width)}${f.says}`),
    `  ${pad("EID_URL", width)}another e-ID (the dev server: http://localhost:3456)`,
    "",
    "eid help <command> for one in full.",
  ].join("\n")
}

/** `eid help <command>`: one command in full. */
export function detail(c: Command): string {
  const flags = c.flags ?? []
  const width = Math.max(0, ...flags.map((f) => f.flag.length)) + 4
  return [
    `eid ${c.usage}`,
    `  ${c.says}`,
    ...(c.more ? ["", `  ${c.more}`] : []),
    ...(flags.length
      ? ["", ...flags.map((f) => `  ${pad(f.flag, width)}${f.says}`)]
      : []),
    ...(c.examples?.length ? ["", ...c.examples.map((e) => `  $ ${e}`)] : []),
  ].join("\n")
}
