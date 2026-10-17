// EVERY COMMAND eid HAS, as data: the one source `eid --help`, `eid help
// <command>`, `eid help --json`, the parse and its refusals, and the agent skill
// (skill.ts) are read from (ts-utils `program`), and the table the dispatcher
// (eid.ts) must answer in full, so a command cannot exist without its words or
// its words without the command (`RUN`'s type). `json` says what `--json`
// prints: an API schema by its id (lib/api-schemas, in
// e-id.to/api/v1/openapi.json), the very answer the API gave, or a shape of the
// CLI's own, spelled out.

import { program, ui } from "@adriangalilea/utils/cli"
import pkg from "../package.json" with { type: "json" }

/** A send's or a watch's folder: one spelling, as every command takes it. */
const DIR = { type: "string", short: "d", value: "<path>" } as const

export const EID = program({
  name: "eid",
  version: pkg.version,
  says: "your e-ID from a terminal",
  about: ["also 👤, and npx @e-id/eid with nothing installed"],
  global: {
    json: {
      type: "boolean",
      says: "the answer as JSON on stdout; a failure as { error: { code, message } }, exit 1",
    },
    on: {
      type: "string",
      value: "<domain>",
      says: "the domain addresses are printed on: eid.to (default), e-id.to, 👤.to, xn--mq8h.to",
    },
    "no-browser": {
      type: "boolean",
      says: "where signing in, print the address instead of opening it",
    },
  },
  env: [
    [
      "EID_URL",
      `another e-ID ${ui.muted("(the dev server: http://localhost:3456)")}`,
    ],
  ],
  foot: "the API: e-id.to/api/v1/openapi.json",
  commands: {
    login: {
      says: "sign this machine in, with GitHub or Google",
      more: "Shows a code and opens e-id.to/cli, where you approve it signed in (an account is made then if you have none). The machine keeps a key at ~/.config/eid/config.json, revocable at e-id.to/cli. Over ssh the address is printed, never opened. Any command that needs you signed in offers this first. With --json the code and the address go to stderr, the answer to stdout.",
      json: "{ username, base }",
    },
    logout: {
      says: "sign this machine out, revoking its key",
      json: "{ signedOut, base }",
    },
    whoami: {
      says: "who you are, and your address on every domain",
      json: "Me, with signedIn; { signedIn: false, base } signed out",
    },
    link: {
      args: "<url> [name]",
      says: "a short link to <url> at /you/<name>, printed and copied",
      flags: {
        until: {
          type: "string",
          value: "<day|Nd>",
          says: "the last day it opens: 2026-12-31, or 7d",
        },
        opens: {
          type: "string",
          value: "<n>",
          says: "how many times it opens (1: one use)",
        },
        card: {
          type: "string",
          value: "<label>",
          says: "on your card too, named <label>",
        },
      },
      more: "Without a name it gets a made-up code (six letters and digits). Refused where Google Safe Browsing lists the address, past what your account may keep (a new account keeps one, more as it ages: eid ls says when), or at a name you already use. A link that stops (--until, --opens) is never on your card.",
      examples: [
        "eid link https://example.com/cv.pdf cv",
        "eid link https://example.com/notes.zip --opens 1",
        "eid link https://example.com/talk talk --until 7d --on 👤.to",
      ],
      json: "ShortLink, with address",
    },
    send: {
      args: "<path> [name]",
      says: "send a file or a folder from this machine, until you stop",
      flags: {
        to: {
          type: "string",
          short: "t",
          value: "<user>",
          list: true,
          says: "only for these e-ID accounts (ada,bob): it waits in their inbox, and nobody else can open it",
        },
        self: {
          type: "boolean",
          short: "s",
          says: "for you, on your other machines: it waits in your own inbox (with --to, for them and you)",
        },
        password: {
          type: "string",
          value: "<words>",
          says: "anyone with the address and the password (for someone without an account)",
        },
        stay: {
          type: "boolean",
          says: "with --to, keep sending once everyone it is for has answered",
        },
      },
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
    get: {
      args: "<address>",
      says: "get what someone is sending you, by its address, asking first",
      flags: {
        dir: { ...DIR, says: "where to put it (here by default)" },
        yes: {
          type: "boolean",
          short: "y",
          says: "take it without asking: for a program that chose this one file",
        },
        password: {
          type: "string",
          value: "<words>",
          says: "the send's password, where it has one (asked in a terminal otherwise)",
        },
      },
      more: "Takes the address as it was given (eid.to/ada/notes, with or without https://, on any of e-ID's domains). Shows who is sending what, and its size, and asks before anything comes; without a terminal it refuses unless told --yes. No account needed for a public send; a send for you needs this machine signed in as you. Refuses to overwrite a file of that name. The sender must still be sending: where their machine is not answering (asleep, offline), it waits for it. A dropped connection is picked up where it stopped, and what came is kept in the folder, so running it again picks up from there too.",
      examples: [
        "eid get eid.to/ada/notes",
        "npx @e-id/eid get eid.to/ada/notes",
        "eid get ada/notes --yes --json",
      ],
      json: "{ file, size, path, from }",
    },
    inbox: {
      says: "what people are sending you, waiting to be taken",
      flags: {
        watch: {
          type: "boolean",
          short: "w",
          says: "wait for sends, asking about each (y/N), until Ctrl-C",
        },
        once: {
          type: "boolean",
          short: "o",
          says: "while watching, end once a file is taken (with --json, once one is shown)",
        },
        "accept-from": {
          type: "string",
          value: "<user>",
          list: true,
          says: "while watching, take what these people send without asking (ada,bob)",
        },
        dir: {
          ...DIR,
          says: "while watching, where taken files go (here by default), chosen as the watch begins",
        },
      },
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
    ls: {
      says: "your short links and sends (whom each is for, who took it or said no), and how many you may keep",
      json: "Links",
    },
    rm: {
      args: "<name>",
      says: "delete one of your short links",
      more: "It opens nothing from then on, and its name is free for another of yours.",
      json: "{ deleted }",
    },
    card: {
      args: "[username]",
      says: "a card, yours without a name",
      more: "Anyone's card, as its page shows it. With --json, the card as data in e-ID's open format (e-id.to/card.schema.json).",
      examples: ["eid card", "eid card adrian"],
      json: "the card format (e-id.to/card.schema.json)",
    },
    set: {
      args: "<what> <value>",
      says: "change your card: name, bio, country, vouches, or a platform's link",
      more: "<what> is name, bio, country (a two-letter code), vouches (on or off), or a platform (github, twitter, youtube, instagram, telegram, website, email, self) to set its link to <value>: your handle there, or the address for a website or an email. Written through the same checks as the card editor.",
      examples: [
        'eid set name "Ada Lovelace"',
        "eid set github adalovelace",
        "eid set vouches off",
      ],
      json: "MyCard",
    },
    unset: {
      args: "<platform>",
      says: "take a platform's link off your card",
      examples: ["eid unset instagram"],
      json: "MyCard",
    },
    stats: {
      says: "your numbers: visits to your page, links opened",
      json: "Stats",
    },
    skill: {
      args: "[install]",
      says: "the agent skill for eid: printed, or installed for Claude Code",
      flags: {
        dir: {
          ...DIR,
          says: "where to install it (default ~/.claude/skills/eid)",
        },
      },
      more: "Printed from this eid, so it describes exactly the eid installed. Once installed, every run of a newer eid rewrites it, so it never falls behind.",
      json: "{ skill } printed, { installed } installed",
    },
  },
  sections: [
    ["files", ["send", "get", "inbox"]],
    ["links", ["link", "ls", "rm"]],
    ["your card", ["card", "set", "unset", "stats"]],
    ["this machine", ["login", "logout", "whoami", "skill", "help"]],
  ],
})

/** One command asked for, its values typed by its own flags. */
export type Call = Exclude<ReturnType<typeof EID.parse>, { kind: "print" }>
export type CommandName = Call["command"]
