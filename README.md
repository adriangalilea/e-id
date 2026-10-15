# e-ID

Your digital identity: one page at [👤.to/you](https://👤.to) for everywhere you are online. Sign in with GitHub or Google and it fills itself.

## What it does

- **One address, three spellings.** `e-id.to/you`, `eid.to/you` and `👤.to/you` are the same page. Safari shows the emoji in its address bar, so Safari is sent to `👤.to` and every other browser to `e-id.to`; signing in on one is signed in on the other.
- **Links by name.** `e-id.to/you/github` (or `gh`, `x`, `youtube`, …) opens your link on that platform.
- **The card as data.** `/you/card.json` in an open format ([its schema](https://e-id.to/card.schema.json)), `/you/card.vcf` for contacts, `/you/card.svg` and `/you/byline.svg` as images.
- **Embeds.** `<e-id-card handle="you">` on any page with one script (`/embed.js`), and oEmbed, so an address pasted into a site that reads it becomes the card.
- **Vouches.** Visitors leave a word on your page; you pin the one you want shown.

Built with Next.js, better-auth, and Drizzle on Turso. The interface comes from [ui.adriangalilea.com](https://ui.adriangalilea.com).

## Decisions

- **The person is the namespace.** `eid.to/you` is the product and stays at the root, never under `/u/`. Everything a person makes lives under their name, `eid.to/you/<name>`: a platform (`/you/gh`), a link of theirs (`/you/cv`), a short-lived share. Whoever receives one sees whose it is before opening it, and every link belongs to a signed-in account, so abuse is banned with the account.
- **One rule for `/you/<name>`:** a platform name opens that link, a name of theirs opens that link, anything else (a typo, a platform they have no link on) opens their profile. Only a person who does not exist is a 404.
- **No anonymous short links on these domains,** at the root, under a path or on a subdomain. They are what phishing runs on, and once enough bad ones pass through, Safe Browsing and mail filters flag the whole domain, every profile with it. Anonymous shortening, if ever, gets a domain of its own.
- **e-ID's own names are reserved** in `forbiddenUsernames` (`api`, `dev`, and what comes). Usernames are 5 characters or more today; whether shorter ones are sold is open (Premium).

## To do

- [ ] links of your own, `/you/<name>`: named or a generated code (6 characters, always one digit, so never a platform's name), optionally expiring by a date, a number of visits or one use. A name a platform already has, or one of the card's files (`card.json`, `card.svg`, …), is refused.
- [ ] record what `/you/<name>` opened, or that someone looked for a name that opened nothing: the demand for a link they do not have (needs visits on, below)
- [ ] visits on in production: the recording exists (`/api/events`, the ui registry's `visits`) and is off until its database is set
- [ ] vouches: the send button waits for words; a profile can turn vouches off
- [ ] an optional status line on the profile and its share image
- [ ] a write API (`card.json` is the read one)
- [ ] passkeys (better-auth has them)

### Premium

- [ ] analytics: your page's visits and what your links opened, each `/you/<name>` counted (visits, when, from where); the whole site's for the admin
- [ ] more usernames, each a permanent redirect to your page, so a new main name keeps every old link working (`adriangalilea` → `adrian`)
- [ ] claimable usernames: stops squatting
- [ ] short usernames (3 and 4 characters) sold, 1 and 2 kept for e-ID; decide the price, and whether a bought name can be resold
- [ ] an email address, `you@eid.to`
  - Why: `eid.to/you/mail` opens your email link in a browser, but a mail client's "To:" refuses it (an address is `name@domain`, never a path). A real address reaches you without showing your own.
  - Gated: every alias is a relay anyone can write to, and forwarding costs money per domain.
  - Inbound mail on `eid.to`, `e-id.to` and `👤.to` (`xn--mq8h.to`) to a forwarding service that rewrites the sender so forwarded mail passes the receiving server's checks (SRS) and filters spam: [Forward Email](https://forwardemail.net) (open source, alias API, about $3 a month a domain). Not Cloudflare Email Routing: it forwards only to addresses verified inside the account.
  - e-ID keeps the aliases: setting, changing or removing the email link creates, moves or deletes `you@eid.to` through the service's API (its key in the deployment's environment, never here).
  - Decide: the address shown (`eid.to`, the shortest, or `e-id.to`), and whether it needs a public email link or is a private alias for any member.
  - `e-id.to` forwards a few fixed aliases today: list them before its mail moves, so none is lost.

### Ideas

- live activity: a feed (RSS or Atom), a YouTube channel (each has a feed), Bluesky, mixed into the latest of what you made, on your page
- `curl eid.to/you` answering with the card in text
- following people, only if it brings something with it (their card kept current in your contacts)
- languages and skills, if a card can hold them and stay simple (it starts to be a CV)

## Credits

The emoji domain's progressive enhancement is [jonroig's emojiurlifier](https://github.com/jonroig/emojiurlifier) idea, done here in the site's own redirects. Third-party notices are in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
