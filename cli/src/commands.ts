// EVERY COMMAND eid HAS, as data: the one source `eid --help`, `eid help
// <command>`, `eid help --json` and the agent skill (skill.ts) are printed from,
// and the table the dispatcher (eid.ts) must answer in full, so a command cannot
// exist without its words or its words without the command (`Runners`, a type
// error either way). `json` says what `--json` prints: an API schema by its id
// (lib/api-schemas, in e-id.to/api/v1/openapi.json), the very answer the API
// gave, or a shape of the CLI's own, spelled out.

import { indent, table, ui, width } from "@adriangalilea/utils/cli"

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
  /** What `--json` prints. */
  json: string
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
    more: "Shows a code and opens e-id.to/cli, where you approve it signed in (an account is made then if you have none). The machine keeps a key at ~/.config/eid/config.json, revocable at e-id.to/cli. Over ssh the address is printed, never opened. Any command that needs you signed in offers this first. With --json the code and the address go to stderr, the answer to stdout.",
    json: "{ username, base }",
  },
  {
    name: "logout",
    usage: "logout",
    says: "sign this machine out, revoking its key",
    json: "{ signedOut, base }",
  },
  {
    name: "whoami",
    usage: "whoami",
    says: "who you are, and your address on every domain",
    json: "Me, with signedIn; { signedIn: false, base } signed out",
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
    json: "ShortLink, with address",
  },
  {
    name: "send",
    usage: "send <path> [name]",
    says: "send a file or a folder from this machine, until you stop",
    flags: [
      {
        flag: "-t, --to <people>",
        says: "only for these e-ID accounts (ada,bob): it waits in their inbox, and nobody else can open it",
      },
      {
        flag: "-s, --self",
        says: "for you, on your other machines: it waits in your own inbox (with --to, for them and you)",
      },
      {
        flag: "--password <words>",
        says: "anyone with the address and the password (for someone without an account)",
      },
      {
        flag: "--stay",
        says: "with --to, keep sending once everyone it is for has answered",
      },
      {
        flag: "--on <domain>",
        says: "the domain in the command printed (eid.to by default)",
      },
    ],
    more: "Prints `npx @e-id/eid get eid.to/you/<name>`, copied, for whoever you send it to: they need nothing installed and no account. With --to it is for those people only: e-ID gives its ticket to their keys alone, it waits in their `eid inbox`, and `eid ls` says when each took it. With --password, whoever opens the address is asked for it (kept hashed at e-ID, checked there). The file goes straight from this machine to theirs (n0's sendme, end to end encrypted, through n0's relays where the two cannot reach each other), never through e-ID, which holds only the name and who may have it. It prints each answer as it comes (who said yes, who said no) and each file as it lands, by name where they are signed in. A send for anyone runs until Ctrl-C, which takes the name away; a send --to people stops by itself once each of them has taken it or said no, unless --stay. While this machine is asleep or offline the send is paused; a day without it and the name goes. Sending the same file again from this machine gives it the same address, unless a name is given or that one is taken. Where the machines connect directly, each sees the other's IP address. The first send fetches sendme (about 4 MB, checked against its known SHA-256) into ~/.cache/eid.",
    examples: [
      "eid send notes.zip",
      "eid send ./slides talk",
      "eid send draft.pdf --to ada,bob",
      "eid send report.pdf -s",
      "eid send photos.zip --password 'blue harbour'",
    ],
    json: "SendMade, with address and command, printed once serving; then each SendEvents event as a line while the command keeps running",
  },
  {
    name: "get",
    usage: "get <address>",
    says: "get what someone is sending you, by its address, asking first",
    flags: [
      { flag: "-d, --dir <path>", says: "where to put it (here by default)" },
      {
        flag: "--yes",
        says: "take it without asking: for a program that chose this one file",
      },
      {
        flag: "--password <words>",
        says: "the send's password, where it has one (asked in a terminal otherwise)",
      },
    ],
    more: "Takes the address as it was given (eid.to/ada/notes, with or without https://, on any of e-ID's domains). Shows who is sending what, and its size, and asks before anything comes; without a terminal it refuses unless told --yes. No account needed for a public send; a send for you needs this machine signed in as you. Refuses to overwrite a file of that name. The sender must still be sending: where their machine is not answering (asleep, offline), it waits for it. A dropped connection is picked up where it stopped, and what came is kept in the folder, so running it again picks up from there too.",
    examples: [
      "eid get eid.to/ada/notes",
      "npx @e-id/eid get eid.to/ada/notes",
      "eid get ada/notes --yes --json",
    ],
    json: "{ file, size, path, from }",
  },
  {
    name: "inbox",
    usage: "inbox",
    says: "what people are sending you, waiting to be taken",
    flags: [
      {
        flag: "-w, --watch",
        says: "wait for sends, asking about each (y/N), until Ctrl-C",
      },
      {
        flag: "-o, --once",
        says: "while watching, end once a file is taken (with --json, once one is shown)",
      },
      {
        flag: "--accept-from <people>",
        says: "while watching, take what these people send without asking (ada,bob)",
      },
      {
        flag: "-d, --dir <path>",
        says: "while watching, where taken files go (here by default), chosen as the watch begins",
      },
    ],
    more: "Each send for you with who sends it (their name, @handle and page), the file and its size, and since when; eid get <address> takes one. --watch waits for an arrival and asks before anything comes down; a no tells its sender and the watch goes on. --accept-from names whom you take from without asking, never everyone: a blanket accept is how a stranger's file lands unread. With --json, --watch prints each arrival as a line and takes nothing. A send leaves the inbox once taken or said no to, or when its sender stops.",
    examples: [
      "eid inbox",
      "eid inbox -w",
      "eid inbox -wo",
      "eid inbox -w -d ~/Downloads",
      "eid inbox -w --accept-from ada",
      "eid inbox -wo --json",
    ],
    json: "Inbox; with --watch, one waiting send per line",
  },
  {
    name: "ls",
    usage: "ls",
    says: "your short links and sends (whom each is for, who took it or said no), and how many you may keep",
    json: "Links",
  },
  {
    name: "rm",
    usage: "rm <name>",
    says: "delete one of your short links",
    more: "It opens nothing from then on, and its name is free for another of yours.",
    json: "{ deleted }",
  },
  {
    name: "card",
    usage: "card [username]",
    says: "a card, yours without a name",
    more: "Anyone's card, as its page shows it. With --json, the card as data in e-ID's open format (e-id.to/card.schema.json).",
    examples: ["eid card", "eid card adrian"],
    json: "the card format (e-id.to/card.schema.json)",
  },
  {
    name: "set",
    usage: "set <what> <value>",
    says: "change your card: name, bio, country, vouches, or a platform's link",
    more: "<what> is name, bio, country (a two-letter code), vouches (on or off), or a platform (github, twitter, youtube, instagram, telegram, website, email, self) to set its link to <value>: your handle there, or the address for a website or an email. Written through the same checks as the card editor.",
    examples: [
      'eid set name "Ada Lovelace"',
      "eid set github adalovelace",
      "eid set vouches off",
    ],
    json: "MyCard",
  },
  {
    name: "unset",
    usage: "unset <platform>",
    says: "take a platform's link off your card",
    examples: ["eid unset instagram"],
    json: "MyCard",
  },
  {
    name: "stats",
    usage: "stats",
    says: "your numbers: visits to your page, links opened",
    json: "Stats",
  },
  {
    name: "skill",
    usage: "skill [install]",
    says: "the agent skill for eid: printed, or installed for Claude Code",
    flags: [
      {
        flag: "-d, --dir <path>",
        says: "where to install it (default ~/.claude/skills/eid)",
      },
    ],
    more: "Printed from this eid, so it describes exactly the eid installed. Once installed, every run of a newer eid rewrites it, so it never falls behind.",
    json: "{ skill } printed, { installed } installed",
  },
  {
    name: "help",
    usage: "help [command]",
    says: "these words, or one command's in full",
    more: "With --json, every command as this table holds it: its usage, flags, words and what its --json prints.",
    json: "{ version, commands, global }",
  },
] as const satisfies readonly Command[]

/** Shared by every command. */
export const GLOBAL: Flag[] = [
  {
    flag: "--json",
    says: "the answer as JSON on stdout; a failure as { error: { code, message } }, exit 1",
  },
  { flag: "--version", says: "this eid's version" },
]

export const commandNamed = (name: string): Command | undefined =>
  (COMMANDS as readonly Command[]).find((c) => c.name === name)

/** The overview's sections, in order: every command in exactly one (asserted). */
const SECTIONS: [string, CommandName[]][] = [
  ["files", ["send", "get", "inbox"]],
  ["links", ["link", "ls", "rm"]],
  ["your card", ["card", "set", "unset", "stats"]],
  ["this machine", ["login", "logout", "whoami", "skill", "help"]],
]
{
  const placed = SECTIONS.flatMap(([, names]) => names)
  const missing = COMMANDS.filter((c) => !placed.includes(c.name))
  if (missing.length || placed.length !== COMMANDS.length)
    throw new Error(
      `commands: every command in one overview section (missing: ${missing.map((c) => c.name).join(", ") || "none"})`,
    )
}

/** A usage as typed: `eid` and its arguments quiet, the command's name standing out. */
function usageOf(c: Command): string {
  const [name, ...args] = c.usage.split(" ")
  return `${ui.muted("eid")} ${ui.head(name ?? "")}${args.length ? ` ${ui.muted(args.join(" "))}` : ""}`
}

/** `text` folded to the terminal's width (80 at most, a reading measure), each line
 *  after `indent` spaces. */
function wrap(text: string, indent: number): string {
  const width = Math.min(80, process.stdout.columns || 80) - indent
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines.map((l) => `${" ".repeat(indent)}${l}`).join("\n")
}

/** A heading, as the overview's sections and a command's parts are named. */
const heading = (s: string) => `  ${ui.accent(s)}`

/** `eid --help`: every command on a line, by what it is for. */
export function overview(version: string): string {
  const named = new Map(
    (COMMANDS as readonly Command[]).map((c) => [c.name, c]),
  )
  type Row = [string, string]
  const sections: [string, Row[]][] = [
    ...SECTIONS.map(([title, names]): [string, Row[]] => [
      title,
      names.map((n): Row => {
        const c = named.get(n) as Command
        return [usageOf(c), c.says]
      }),
    ]),
    [
      "on every command",
      [
        ...GLOBAL.map((f): Row => [f.flag, f.says]),
        [
          "EID_URL",
          `another e-ID ${ui.muted("(the dev server: http://localhost:3456)")}`,
        ],
      ],
    ],
  ]
  // One column for the whole page, every section's words starting at one edge.
  const column =
    Math.max(
      ...sections.flatMap(([, rows]) => rows.map(([left]) => width(left))),
    ) + 2
  const line = ([left, right]: Row) =>
    `    ${left}${" ".repeat(column - width(left))}${right}`
  return [
    "",
    `  ${ui.head("eid")} ${ui.muted(version)}  your e-ID from a terminal`,
    `  ${ui.muted("also 👤, and npx @e-id/eid with nothing installed")}`,
    ...sections.flatMap(([title, rows]) => [
      "",
      heading(title),
      ...rows.map(line),
    ]),
    "",
    `  ${ui.muted("eid help <command> for one in full · the API: e-id.to/api/v1/openapi.json")}`,
    "",
  ].join("\n")
}

/** `eid help <command>`: one command in full. */
export function detail(c: Command): string {
  const flags = c.flags ?? []
  return [
    "",
    `  ${usageOf(c)}`,
    `  ${c.says}`,
    ...(c.more ? ["", wrap(c.more, 2)] : []),
    ...(flags.length
      ? [
          "",
          heading("flags"),
          indent(table(flags.map((f) => [f.flag, f.says])), 4),
        ]
      : []),
    ...(c.examples?.length
      ? [
          "",
          heading("examples"),
          ...c.examples.map((e) => `    ${ui.muted("$")} ${e}`),
        ]
      : []),
    "",
    heading("--json"),
    wrap(c.json, 4),
    "",
  ].join("\n")
}
