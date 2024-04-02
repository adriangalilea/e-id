⚠️ WIP

e-ID is your dynamic digital business card.

A constant pointer to your ever-changing web presence.

# ⭐ features

- Mnemonic and readable.
  - e-ID to [[your_name]]
  - [e-id.to/adriangalilea](https://e-id.to/adriangalilea)
- Visual.
  - [👤️️.to](https://👤️️.to)
- Useful.
  - e-id.to/adriangalilea/x will redirect you to adriangalilea's x profile if it exists.
  - if it doesn't, it will redirect to e-id.to/adriangalilea BUT it will log this intention, meaning that you'll know the demand for a social network you may not have.
- **Interchangeable Domains**
  - [e-id.to](https://e-id.to)
  - [eid.to](https://eid.to)
  - [👤️️.to](https://👤️️.to)
  - **Progressive enhancement on browsers that support emoji domain**
    - [e-id.to](https://e-id.to) and [eid.to](https://eid.to) redirect to [👤️️.to](https://👤️️.to) in safari
    - [👤️️.to](https://👤️️.to) redirects to [e-id.to](https://e-id.to) in anything else.

# 📝 tasks

## todo

- [ ] feat: preserve state when switching tabs using [zustand](https://github.com/pmndrs/zustand/blob/main/docs/guides/nextjs.md)
- [ ] feat: every social component integration should be a component that handles if it's editing or visualising, if visualising is where I'll add analytics
- [ ] feat: instead of /about do about.e-id.to
  - [ ] [branch](https://github.com/adriangalilea/e-id/tree/edit-tabs-preserve-state)
- [ ] feat: github, youtube, twitter, ... followers/sbus
- [ ] feat: opengraph on custom website for social component
  - [ ] [fetch-opengraph node](https://github.com/purphoros/fetch-opengraph)
  - [ ] https://metascraper.js.org/
- [ ] feat: curl
  - [ ] /adriangalilea
  - [ ] /adriangalilea/x
- [ ] feat: /username/[social_media_name]
  - [ ] if exists: redirects to said social media and log.
  - [ ] if not exists: redirects to e-id profile and log user demand.
- [ ] feat: custom auth login window
  - [ ] https://authjs.dev/guides/basics/pages#theming
  - [ ] https://github.com/ndom91/next-auth-example-sign-in-page
  - [ ] https://github.com/shadcn-ui/ui/blob/5c50a32e8f02bd745d2524cd68de6b7cd8d0e8f8/apps/www/app/(app)/examples/authentication/page.tsx
- [ ] feat: premium analytics
  - [ ] Tinybird
    - [ ] [dub](https://github.com/dubinc/dub/tree/main/packages/tinybird)
    - [ ] [elena](https://youtu.be/koLTjbEco7Q)
  - [ ] [Tremor](https://www.tremor.so/)
    - [ ] [josh](https://youtu.be/MGjCIQh5Pkw)
- [ ] feat: API
  - [ ] get
    - [ ] `userByID`
    - [ ] `userByUsername`
  - [ ] post
    - [ ] `patchUser`
- [ ] feat: premium claimable username
  - [ ] prevents squatting
  - [ ] allows speculation (?)
- [ ] tracking every social media / blog rss
  - [ ] default being only the last element
  - [ ] aliveness score
- [ ] feat: friends / followers
  - [ ] notify when friends make new places
- [ ] feat: create a widget, similar to those that can be embedded in github.
- [ ] feat: optimizations
  - [ ] do not use session on [username]/page.tsx since it breaks the static site generation
  - [ ] cache github activity component
  - [ ] cache opengraph from custom website
- [ ] style: comment input button disabled while not text
- [ ] feat: dynamic highlight (last/last-pinned tweet, last/last-pinned video, ...)
- [ ] feat: dynamic github, youtube, twitter, ... followers/sbus
- [ ] feat: disallow comments option
- [ ] style: ensure name and username inputs are similar in size to regular profile
- [ ] style: country display flag at rest
- [ ] feat: basic user info (birthdate/languages/skills)
- [ ] style: test (add metadata to all socials and divide in half to show a square button on the right and info on the left, username/followers/...)
- [ ] style: add alt to highlights
- [ ] feat: instant changelog from github

# done

- [x] feat: being able to edit your own profile
  - [x] country combobox
  - [x] simple input for all data
  - [x] allows toggling visibility
  - [x] add new socials
  - [x] remove socials
- [x] feat: SEO
- [x] feat: google auth prod
- [x] style: remove github icon from footer into FAQ
- [x] style: clean FAQ
- [x] feat: do not show email by default, only suggest.
- [x] feat: Socials as a different table
- [x] feat: dub.co license
- [x] fix: flash of mobile menu
- [x] feat: signup
- [x] feat: auth on every domain
- [x] feat: display profile info, minimal style.
- [x] feat: sign in on mobile
- [x] feat: comments on profile
- [x] feat: preserve user email
- [x] fix: username taken warning on a non logged-in user
- [x] feat: handle username by auth provider taken
- [x] feat: being able to choose another username
  - [x] add warning on username to prompt editing `i your profile is unreachable without username`
- [x] fix: comments showing on the wrong account when commenting on another account
- [x] style: fonts
  - [x] [space mono](https://fonts.google.com/specimen/Space+Mono) for stats, number, dates and system style
  - [x] inter for general text
  - [.] consider [cormorant](https://fonts.google.com/specimen/Cormorant) for quotes?
- [x] /edit 2.0
  - [x] unify social profile editing and display
  - [x] highlight comment -> testimonial
  - [x] socials is the same visually as SocialComponent
- [x] feat: edit cusotm order
- [x] feat: edit higlight
- [x] feat: remove highlighted from comment section visually
- [x] feat: allow to unpinp higlight
- [x] feat: /about how to add emoji domain to twitter
- [x] usernames matching for url [username] convert to lowercase
- [x] feat: list of forbidden handles
  - [x] I don't need auth because it has higher priority than [username]
  - [x] /null path to edit null username
  - [x] enforce non allowing such handles in user creation from auth
  - [x] enforce non allowing such handles in server actions
  - [x] enforce non allowing such handles in /null
  - [x] enforce not allowing different casing for the same url taken

# blocked

- [.] feat: auth
  - [x] google
  - [.] apple passkey -> revisit when [lucia-auth has passkeys](https://lucia-auth.com/guides/passkeys)

# Credits

[Progressive enhancement emoji URL's idea](https://github.com/jonroig/emojiurlifier). I implemented it on the next.js middleware, so it's a bit cleaner.
