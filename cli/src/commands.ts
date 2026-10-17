// EVERY COMMAND eid HAS, as data: the one source `eid --help`, `eid help
// <command>`, `eid help --json` and the agent skill (skill.ts) are printed from,
// and the table the dispatcher (eid.ts) must answer in full, so a command cannot
// exist without its words or its words without the command (`Runners`, a type
// error either way). `json` says what `--json` prints: an API schema by its id
// (lib/api-schemas, in e-id.to/api/v1/openapi.json), the very answer the API
// gave, or a shape of the CLI's own, spelled out.

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
        flag: "--to <people>",
        says: "only for these e-ID accounts (ada,bob): it waits in their inbox, and nobody else can open it",
      },
      {
        flag: "--password <words>",
        says: "anyone with the address and the password (for someone without an account)",
      },
      {
        flag: "--on <domain>",
        says: "the domain in the command printed (eid.to by default)",
      },
    ],
    more: "Prints `npx @e-id/eid get eid.to/you/<name>`, copied, for whoever you send it to: they need nothing installed and no account. With --to it is for those people only: e-ID gives its ticket to their keys alone, it waits in their `eid inbox`, and `eid ls` says when each took it. With --password, whoever opens the address is asked for it (kept hashed at e-ID, checked there). The file goes straight from this machine to theirs (n0's sendme, end to end encrypted, through n0's relays where the two cannot reach each other), never through e-ID, which holds only the name and who may have it. It is there for as long as this command runs, which prints each download as it starts and as it lands, and who it is where they are signed in: Ctrl-C stops it and takes the name away. While this machine is asleep or offline the send is paused; a day without it and the name goes. Sending the same file again from this machine gives it the same address, unless a name is given or that one is taken. Where the machines connect directly, each sees the other's IP address. The first send fetches sendme (about 4 MB, checked against its known SHA-256) into ~/.cache/eid.",
    examples: [
      "eid send notes.zip",
      "eid send ./slides talk",
      "eid send draft.pdf --to ada,bob",
      "eid send photos.zip --password 'blue harbour'",
    ],
    json: "SendMade, with address and command, printed once serving; then each SendEvents event as a line while the command keeps running",
  },
  {
    name: "get",
    usage: "get <address>",
    says: "get what someone is sending you, by its address, asking first",
    flags: [
      { flag: "--dir <path>", says: "where to put it (here by default)" },
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
        flag: "--watch",
        says: "wait, and ask about each send as it arrives (y/N)",
      },
      {
        flag: "--accept-from <people>",
        says: "while watching, take what these people send without asking (ada,bob)",
      },
      { flag: "--dir <path>", says: "where taken files go (here by default)" },
    ],
    more: "Each send for you with who sends it (their name and @handle), the file and its size, and since when; eid get <address> takes one. --watch waits for arrivals and asks before anything comes down; --accept-from names whom you take from without asking, never everyone: a blanket accept is how a stranger's file lands unread. With --json, --watch prints each arrival as a line and takes nothing. A send leaves the inbox once taken, or when its sender stops.",
    examples: [
      "eid inbox",
      "eid inbox --watch",
      "eid inbox --watch --accept-from ada",
      "eid inbox --watch --json",
    ],
    json: "Inbox; with --watch, one waiting send per line",
  },
  {
    name: "ls",
    usage: "ls",
    says: "your short links and sends (whom each is for, who took it), and how many you may keep",
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
        flag: "--dir <path>",
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

const pad = (s: string, n: number) => s + " ".repeat(Math.max(1, n - s.length))

/** `eid --help`: every command on a line. */
export function overview(version: string): string {
  const width = Math.max(...COMMANDS.map((c) => c.usage.length)) + 6
  return [
    `eid ${version}: your e-ID from a terminal (also 👤, and npx @e-id/eid)`,
    "",
    ...COMMANDS.map((c) => `  ${pad(`eid ${c.usage}`, width)}${c.says}`),
    "",
    ...GLOBAL.map((f) => `  ${pad(f.flag, width)}${f.says}`),
    `  ${pad("EID_URL", width)}another e-ID (the dev server: http://localhost:3456)`,
    "",
    "eid help <command> for one in full. The API: e-id.to/api/v1/openapi.json",
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
    "",
    `  --json: ${c.json}`,
  ].join("\n")
}
