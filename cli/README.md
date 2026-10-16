# eid

Your [e-ID](https://e-id.to) from a terminal: short links under your page, your numbers, anyone's card.

```sh
npx @e-id/eid link https://example.com/cv.pdf cv
# https://eid.to/you/cv (copied)
```

Nothing to set up: the first command that needs you signs this machine in. It shows a code and opens e-id.to, where you approve it with GitHub or Google (an account is made then if you have none). Over ssh it prints the address instead.

Installed, it answers to `eid`, and to `👤`:

```sh
npm i -g @e-id/eid
eid help
```

| | |
|---|---|
| `eid link <url> [name]` | a short link at `eid.to/you/<name>`; `--opens 1` for one use, `--until 7d` to stop on a day |
| `eid ls` · `eid rm <name>` | your short links, and deleting one |
| `eid card [username]` | a card as text |
| `eid stats` | visits to your page, links opened |
| `eid whoami` · `eid logout` | who is signed in; signing out revokes this machine's key |
| `eid skill install` | the [Claude Code](https://claude.com/claude-code) skill, kept current by every newer eid |

`eid help <command>` gives one in full, `--json` gives any answer as JSON. Every link is checked with Google Safe Browsing, and your machines' keys are listed and revocable at [e-id.to/cli](https://e-id.to/cli).

AGPL-3.0. The source is [adriangalilea/e-id](https://github.com/adriangalilea/e-id), in `cli/`.
