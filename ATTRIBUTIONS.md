# Attributions

What e-ID uses that others made, and on what terms. The one list: the README points here.

## In the site

- **Space Grotesk and Space Mono**, the type: SIL Open Font License 1.1, © The Space Grotesk Project Authors and © The Space Mono Project Authors. Their licences ship beside the files, in [`public/fonts`](public/fonts).
- **The brands' marks** (GitHub, X, YouTube, Instagram, and the rest of `lib/brand-icons`): Lucide's drawings as `lucide-react` 0.556.0 shipped them, ISC licence, Lucide Contributors.
- **The sign-in marks** (GitHub, Google): [Simple Icons](https://simpleicons.org), CC0.
- **The home's example cards' portraits** ([`public/showcase`](public/showcase)): Wikipedia's page images, free to reuse; where each came from is in `lib/showcase-examples`.
- **The emoji domain's progressive enhancement** (Safari sent to `👤.to`, every other browser to `e-id.to`): [jonroig's emojiurlifier](https://github.com/jonroig/emojiurlifier), an idea done here in the site's own redirects.
- **Link checking**: [Google Safe Browsing](https://safebrowsing.google.com). Every warning drawn from it carries "Advisory provided by Google", as its terms ask (`lib/threats`).
- **The components in [`components/ui`](components/ui)** and their libraries in `lib/`: copies of items from the [@ag registry](https://ui.adriangalilea.com), under the MIT licence, not this repository's AGPL; reuse them from the registry, where they are kept current. A file committed as `<file>.sealed` is an @ag paid or studio item, encrypted (`scripts/sealed.mts`): it is not published, not part of this repository's source and not licensed to anyone through it (a paid item's terms: https://ui.adriangalilea.com/licence), and the site's build opens it with a key only the deploy holds.

## In the CLI

- **`@adriangalilea/utils`** (its terminal output), bundled into `cli/dist/eid.js`: MIT.
- **[sendme](https://github.com/n0-computer/sendme)**, what `eid send` and `eid get` move files with (peer to peer over [iroh](https://github.com/n0-computer/iroh), BLAKE3-verified), © n0, Inc., Apache License 2.0. Not shipped in the package: each machine fetches n0's own release build from GitHub, checked against its published SHA-256 (`cli/src/sendme.ts`). Where two machines cannot connect directly, n0's public relays carry the encrypted traffic.
