# e-ID

Your digital identity: one page at [👤.to/you](https://👤.to) for everywhere you are online. Sign in with GitHub or Google and it fills itself.

## What it does

- **One address, three spellings.** `e-id.to/you`, `eid.to/you` and `👤.to/you` are the same page. Safari shows the emoji in its address bar, so Safari is sent to `👤.to` and every other browser to `e-id.to`; signing in on one is signed in on the other.
- **Links by name, on every card.** Nothing to set up: each link on your card is at its platform's names, `/you/github` or `/you/gh`, `x` (`twitter`, `tw`), `youtube` (`yt`), `instagram` (`ig`), `telegram` (`tg`), `email` (`mail`), `website` (`web`, `site`). The names are one table, `LINK_NAMES` in `lib/link-names`.
- **The card as data.** `/you/card.json` (or `/you/json`) in an open format ([its schema](https://e-id.to/card.schema.json)), `/you/card.vcf` (or `/you.vcf`) for contacts, `/you/card.svg` and `/you/byline.svg` as images, and `curl eid.to/you` prints it as text (`/you/txt`).
- **Embeds.** `<e-id-card handle="you">` on any page with one script (`/embed.js`), and oEmbed, so an address pasted into a site that reads it becomes the card.
- **Vouches.** Visitors leave a word on your page; you pin the one you want shown.

Built with Next.js, better-auth, and Drizzle on Turso. The interface comes from [ui.adriangalilea.com](https://ui.adriangalilea.com).

## Decisions

- **The person is the namespace.** `eid.to/you` is the product and stays at the root, never under `/u/`. Everything a person makes lives under their name, `eid.to/you/<name>`: a platform (`/you/gh`), a link of theirs (`/you/cv`), a short-lived share. Whoever receives one sees whose it is before opening it, and every link belongs to a signed-in account, so abuse is banned with the account.
- **One rule for `/you/<name>`:** a platform name opens that link, a name of theirs opens that link, anything else (a typo, a platform they have no link on) opens their profile. Only a person who does not exist is a 404.
- **No anonymous short links on these domains,** at the root, under a path or on a subdomain. They are what phishing runs on, and once enough bad ones pass through, Safe Browsing and mail filters flag the whole domain, every profile with it. Anonymous shortening, if ever, gets a domain of its own.
- **e-ID's own names are reserved** in `forbiddenUsernames` (`api`, `dev`, and what comes). Usernames are 5 characters or more today; whether shorter ones are sold is open (Premium).
- **Keep only what is used.** A session is a token and its dates (never an IP address or a browser); a provider's tokens are read once, at linking, then cleared; visits are counted without cookies and never store an IP address. The [privacy page](https://e-id.to/privacy) says what is kept, and must change when the code does.
- **Deleting an account takes everything of theirs at once**, numbers included (`forgetPerson`). Their names are held from anyone else for 90 days (`released_name`), so links still out there open nobody else. The vouches they wrote on other pages stay, signed "a former e-ID member": the page's owner keeps them, nothing of the writer does.

## To do

- [ ] links of your own, `/you/<name>`, for what is not one of your card's platforms (a CV, a talk, a file): named or a generated code (6 characters, always one digit, so never a platform's name), optionally expiring by a date, a number of visits or one use. The names they cannot take are refused by `refusedLinkName` (`lib/link-names`): a platform's names, the card's files.
- [ ] an API for them: personal API keys (better-auth's API-key plugin), each scoped to your own links and rate-limited, so a script or a CLI makes one (`curl -H "Authorization: Bearer …" eid.to/api/links -d '{"to":"…","expires":"7d"}'`). Probably Premium.
- [ ] an optional status line on the profile and its share image
- [ ] a write API for the card (`card.json` is the read one), on the same API keys
- [ ] passkeys (better-auth has them)
- [ ] download your data, all of it: `/you/json` is the card; what it lacks (the account's email, the vouches you wrote, your numbers) is asked for by email today, as the privacy page says, answered within a month. A button would hand over both.
- [ ] live activity: a feed (RSS or Atom), a YouTube channel (each has a feed), Bluesky, GitHub, mixed into the latest of what you made, on your page

### Premium

Everything here waits on the first item.

- [ ] billing: a way to pay (a provider, a price per item or a plan), and what a lapsed payment takes away
- [ ] analytics: the detail of your numbers (visits per day, what each `/you/<name>` opened and the names that opened nothing, referrers, countries). Built (`readOwner`) and shown to admins only; everyone sees their totals. Decide what is free and what is Premium once billing exists.
- [ ] more usernames, sold: each a permanent redirect to your page, so a new main name keeps every old link working. The redirect is built (`username_alias`, `adriangalilea` → `adrian`); buying one, and renaming yourself with the old name kept, are not.
- [ ] claiming a squatted username: a request to take an address someone holds and does not use, or that is your own name or brand (the terms already allow taking one back); decide who judges and how long an unused one is held
- [ ] short usernames (3 and 4 characters) sold, 1 and 2 kept for e-ID; decide the price, and whether a bought name can be resold
- [ ] an email address, `you@eid.to`
  - Why: `eid.to/you/mail` opens your email link in a browser, but a mail client's "To:" refuses it (an address is `name@domain`, never a path). A real address reaches you without showing your own.
  - Gated: every alias is a relay anyone can write to, and forwarding costs money per domain.
  - Inbound mail on `eid.to`, `e-id.to` and `👤.to` (`xn--mq8h.to`) to a forwarding service that rewrites the sender so forwarded mail passes the receiving server's checks (SRS) and filters spam: [Forward Email](https://forwardemail.net) (open source, alias API, about $3 a month a domain). Not Cloudflare Email Routing: it forwards only to addresses verified inside the account.
  - e-ID keeps the aliases: setting, changing or removing the email link creates, moves or deletes `you@eid.to` through the service's API (its key in the deployment's environment, never here).
  - Decide: the address shown (`eid.to`, the shortest, or `e-id.to`), and whether it needs a public email link or is a private alias for any member.
  - `e-id.to` forwards a few fixed aliases today: list them before its mail moves, so none is lost.

### Ideas

- following people, only if it brings something with it (their card kept current in your contacts)
- languages and skills, if a card can hold them and stay simple (it starts to be a CV)

## Credits

The emoji domain's progressive enhancement is [jonroig's emojiurlifier](https://github.com/jonroig/emojiurlifier) idea, done here in the site's own redirects. Third-party notices are in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
