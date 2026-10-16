# e-ID

Your digital identity: one page at [👤.to/you](https://👤.to) for everywhere you are online. Sign in with GitHub or Google and it fills itself.

## What it does

- **One address, three spellings.** `e-id.to/you`, `eid.to/you` and `👤.to/you` are the same page. Safari shows the emoji in its address bar, so Safari is sent to `👤.to` and every other browser to `e-id.to`; signing in on one is signed in on the other.
- **Links by name, on every card.** Nothing to set up: each link on your card is at its platform's names, `/you/github` or `/you/gh`, `x` (`twitter`, `tw`), `youtube` (`yt`), `instagram` (`ig`), `telegram` (`tg`), `email` (`mail`), `website` (`web`, `site`). The names are one table, `LINK_NAMES` in `lib/link-names`.
- **The card as data.** `/you/card.json` (or `/you/json`) in an open format ([its schema](https://e-id.to/card.schema.json)), `/you/card.vcf` (or `/you.vcf`) for contacts, `/you/card.svg` and `/you/byline.svg` as images, and `curl eid.to/you` prints it as text (`/you/txt`).
- **Short links.** `/you/<name>` to anywhere, kept in their own list, each counting its opens and, if you like, stopping on a day or after a number of opens.
- **Latest.** Your page opens on what you made lately, read from the links you already have: repositories you pushed to, posts on your website's feed, uploads to your channel, newest first.
- **Embeds.** `<e-id-card handle="you">` on any page with one script (`/embed.js`), and oEmbed, so an address pasted into a site that reads it becomes the card.
- **Vouches.** Visitors leave a word on your page; you pin the one you want shown, or turn vouches off.
- **Your numbers.** How many visits your page had and how many of your links were opened, under your card, counted without cookies.

Built with Next.js, better-auth, and Drizzle on Turso. The interface comes from [ui.adriangalilea.com](https://ui.adriangalilea.com).

## Decisions

- **The person is the namespace.** `eid.to/you` is the product and stays at the root, never under `/u/`. Everything a person makes lives under their name, `eid.to/you/<name>`: a platform (`/you/gh`), a link of theirs (`/you/cv`), a short-lived share. Whoever receives one sees whose it is before opening it, and every link belongs to a signed-in account, so abuse is banned with the account.
- **One rule for `/you/<name>`:** a platform name opens that link, a name of theirs opens that link, anything else (a typo, a platform they have no link on) opens their profile. Only a person who does not exist is a 404.
- **No anonymous short links on these domains,** at the root, under a path or on a subdomain. They are what phishing runs on, and once enough bad ones pass through, Safe Browsing and mail filters flag the whole domain, every profile with it. Anonymous shortening, if ever, gets a domain of its own.
- **e-ID's own names are reserved** in `forbiddenUsernames` (`api`, `dev`, and what comes). Usernames are 5 characters or more today; whether shorter ones are sold is open (Premium).
- **A card shows where you are; a short link is what you hand out.** Two things, one table (`link`, platform `link` for your own). The card holds your platforms and at most 12 marks in all (about two rows), edited on the card. Short links, `/you/<name>` to anywhere (a CV, a talk, a file), are kept in their own list (the "short links" button beside share and edit), up to 200, each with its opens counted and an optional end (a day, a number of opens, 1 being one use). A short link can also be on the card, named there; one that stops opening never is, since the card is cached and could not know when. Named by you or a made-up code (six letters and digits, always a digit, so never a word or a platform's name); a platform's names and the card's files are refused (`refusedLinkName`). A crawler (a link preview) is sent on without using an open, or pasting a one-use link anywhere would spend it.
- **"Latest" is read, never set up** (`lib/activity`): your newest uploads (a YouTube channel's feed), the repositories you pushed to last (GitHub), and your posts (the RSS or Atom feed your website names, `<link rel="alternate">`), each drawn whole by its own card (a repo with its commits, a post's preview, a video's player). Ordered by date and nothing else, newest first: the five newest from the last 12 months, whatever their source. Older than a year is no news: an upload from 2006 would lead the page.
- **The domain you hand out is chosen where you copy it** (`lib/addresses`): `👤.to` where it is shown as written (X, GitHub), `eid.to` to say or type, `e-id.to` where an emoji is refused. One choice, remembered, the same in the share menu and the short links; the card's own address is always `👤.to`, as it shows. A copy is always the whole address: `👤.to/you` without `https://` is a link nowhere it was checked, with it everywhere.
- **Patterns live on `/dev`** (the dev server, or an admin): each thing done in more than one place, drawn by the components that do it, with the facts it stands on (where each domain becomes a link, and how that was checked). A new place doing the same thing takes the pattern.
- **A page anyone can make e-ID fetch asks the public internet only.** The home's live preview reads the websites a visitor types: through ui's `public-fetch`, which checks the address each connection actually uses (no internal address, no DNS rebinding), and at most 20 previews a visitor every 10 minutes (`lib/rate-limit`, in each server's memory, nothing stored).
- **Keep only what is used.** A session is a token and its dates (never an IP address or a browser); a provider's tokens are read once, at linking, then cleared; visits are counted without cookies and never store an IP address. The [privacy page](https://e-id.to/privacy) says what is kept, and must change when the code does.
- **Deleting an account takes everything of theirs at once**, numbers included (`forgetPerson`). Their names are held from anyone else for 90 days (`released_name`), so links still out there open nobody else. The vouches they wrote on other pages stay, signed "a former e-ID member": the page's owner keeps them, nothing of the writer does.

## To do

- [ ] an API, for scripts and CLIs (a one-use link to send a file, your card kept current from a deploy). The design:
  - First, the writes take a user, not a session: `writeShortLink(userId, …)` and `writeCard(userId, …)`, which the site's actions call with the session's user and the API with the key's, one path for both.
  - Keys: made in the account menu, named, scoped (`links`, `card`, `stats`; never the account itself), shown once (`eid_…`), kept hashed, listed with their prefix and last use, revocable. Built here, a table of hashed keys, rather than `@better-auth/api-key` (its own package since 1.4, with a schema for what is not needed).
  - Endpoints, `/api/v1`, JSON, `Authorization: Bearer eid_…`: `POST /links` `{to, name?, until?, opens?, onCard?}` (`until` a day or `"7d"`), `GET /links`, `PATCH`/`DELETE /links/:name`; `GET /stats`; `PATCH /card` `{name?, bio?, country?, vouches?}`; `PUT`/`DELETE /card/links/:platform`. No whole-card replace: a script replacing everything is easy to get wrong.
  - Limits: the 200 short links and 12 card marks hold; per key, 60 writes a minute and 1000 a day, counted in the database. Optionally, new destinations checked against Google Safe Browsing.
  - Docs: an OpenAPI file from the same schemas, as `card.schema.json` is.
  - Decide: free with these limits, or Premium.
- [ ] passkeys (better-auth has them)
- [ ] download your data, all of it: `/you/json` is the card; what it lacks (the account's email, the vouches you wrote, your numbers) is asked for by email today, as the privacy page says, answered within a month. A button would hand over both.
- [ ] more sources for "latest", by what each would take:
  - a Telegram channel's posts: public at `t.me/s/<channel>` with no API key, and ui's `telegram-chat` already draws a post; the card has Telegram links today
  - a website's releases, a podcast, a newsletter: nothing to build, they come with any RSS or Atom feed the website names
  - Bluesky (its public API, no key) and Mastodon (every account has an RSS feed) once each is a platform on the card
  - X stays out: reading anyone's posts needs its paid API

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
