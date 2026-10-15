# e-ID

Your digital identity: one page at [👤.to/you](https://👤.to) for everywhere you are online. Sign in with GitHub or Google and it fills itself.

## What it does

- **One address, three spellings.** `e-id.to/you`, `eid.to/you` and `👤.to/you` are the same page. Safari shows the emoji in its address bar, so Safari is sent to `👤.to` and every other browser to `e-id.to`; signing in on one is signed in on the other.
- **Links by name.** `e-id.to/you/github` (or `gh`, `x`, `youtube`, …) opens your link on that platform.
- **The card as data.** `/you/card.json` in an open format ([its schema](https://e-id.to/card.schema.json)), `/you/card.vcf` for contacts, `/you/card.svg` and `/you/byline.svg` as images.
- **Embeds.** `<e-id-card handle="you">` on any page with one script (`/embed.js`), and oEmbed, so an address pasted into a site that reads it becomes the card.
- **Vouches.** Visitors leave a word on your page; you pin the one you want shown.

Built with Next.js, better-auth, and Drizzle on Turso. The interface comes from [ui.adriangalilea.com](https://ui.adriangalilea.com).

## To do

- [ ] `/you/<name>` with no such link sends to the profile and records that someone looked for it (a 404 today); link visits are recorded too
- [ ] vouches: the send button waits for words; a profile can turn vouches off
- [ ] an optional status line on the profile and its share image
- [ ] a write API (`card.json` is the read one)
- [ ] passkeys (better-auth has them)

### Premium

- [ ] analytics: who visits, which links they open (visits are already recorded)
- [ ] claimable usernames: stops squatting
- [ ] an email address, `you@eid.to`
  - Why: `eid.to/you/mail` opens your email link in a browser, but a mail client's "To:" refuses it (an address is `name@domain`, never a path). A real address reaches you without showing your own.
  - Gated: every alias is a relay anyone can write to, and forwarding costs money per domain.
  - Inbound mail on `eid.to`, `e-id.to` and `👤.to` (`xn--mq8h.to`) to a forwarding service that rewrites the sender so forwarded mail passes the receiving server's checks (SRS) and filters spam: [Forward Email](https://forwardemail.net) (open source, alias API, about $3 a month a domain). Not Cloudflare Email Routing: it forwards only to addresses verified inside the account.
  - e-ID keeps the aliases: setting, changing or removing the email link creates, moves or deletes `you@eid.to` through the service's API (its key in the deployment's environment, never here).
  - Decide: the address shown (`eid.to`, the shortest, or `e-id.to`), and whether it needs a public email link or is a private alias for any member.
  - `e-id.to` forwards a few fixed aliases today: list them before its mail moves, so none is lost.

### Ideas

- the latest post or video as the highlight, kept current
- following people, told when they add a link
- `curl e-id.to/you` answering in text
- languages and skills on the card

## Credits

The emoji domain's progressive enhancement is [jonroig's emojiurlifier](https://github.com/jonroig/emojiurlifier) idea, done here in the site's own redirects. Third-party notices are in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
