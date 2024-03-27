⚠️ WIP

e-ID is your dynamic digital business card.

A constant pointer to your ever-changing web presence.

# ⭐ Features

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

# 📝 TO-DO

- [ ] feat: opengraph on custom website for social component
- [ ] feat: curl
  - [ ] /adriangalilea
  - [ ] /adriangalilea/x
- [ ] feat: /username/[social_media_name]
  - [ ] if exists: redirects to said social media and log.
  - [ ] if not exists: redirects to e-id profile and log user demand.
- [x] feat: list of forbidden handles
  - [x] I don't need auth because it has higher priority than [username]
  - [x] /null path to edit null username
  - [ ] enforce non allowing such handles in user creation from auth
  - [ ] enforce non allowing such handles in server actions
  - [ ] enforce non allowing such handles in /null
- [ ] feat: custom auth login window
  - [ ] https://authjs.dev/guides/basics/pages#theming
  - [ ] https://github.com/ndom91/next-auth-example-sign-in-page
  - [ ] https://github.com/shadcn-ui/ui/blob/5c50a32e8f02bd745d2524cd68de6b7cd8d0e8f8/apps/www/app/(app)/examples/authentication/page.tsx
- [ ] feat: premium analytics (Tinybird)
  - [ ] [fetch-opengraph node](https://github.com/purphoros/fetch-opengraph)
- [ ] feat: API
  - [ ] get
    - [ ] `userByID`
    - [ ] `userByUsername`
  - [ ] post
    - [ ] `patchUser`
- [ ] consider cheap username fee/time to prevent squatting.
  - [ ] allow speculation (?)
- [ ] allow befriending/following
- [ ] /edit 2.0
  - [ ] highlight comment -> testimonial
  - [x] socials is the same visually as SocialComponent
  - [ ] [branch](https://github.com/adriangalilea/e-id/tree/edit-tabs-preserve-state) preserve state when switching tabs using [zustand](https://github.com/pmndrs/zustand/blob/main/docs/guides/nextjs.md)
  - [ ] custom order
  - [ ] github
    - [ ] followers
    - [ ] activity
      - [ ] toggle
      - [x] implementation
  - [.] youtube
    - [ ] followers
    - [ ] highlight
      - [x] implementation
      - [ ] input
      - [ ] toggle
      - [ ] activity(last video/pinned video)
  - [ ] twitter
    - [ ] followers
    - [.] highlight
      - [x] implemented
      - [ ] input
      - [ ] toggle
      - [ ] activity(last tweet/pinned tweet)
  - [ ] disallow comments
  - [ ] country
    - [ ] display flag at rest
  - [ ] birthdate
  - [ ] ensure name and username inputs are similar in size to regular profile
- [ ] consider tracking for every social media
  - [ ] default being only the last element
  - [ ] aliveness score
  - [ ] notify when friends make new places
- [ ] feat: premium claimable username
- [ ] feat: optimizations
  - [ ] do not use session on [username]/page.tsx since it breaks the static site generation
  - [ ] cache github activity component
  - [ ] cache opengraph from custom website
- [ ] style: comment input button disabled while not text

# blocked

- [x] feat: being able to edit your own profile
  - [x] country combobox
  - [x] simple input for all data
  - [x] allows toggling visibility
  - [x] add new socials
  - [x] remove socials
- [x] feat: SEO
- [x] feat: google auth prod
- [.] feat: auth
  - [x] google
  - [.] apple passkey -> revisit when [lucia-auth has passkeys](https://lucia-auth.com/guides/passkeys)
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

# Credits

[Progressive enhancement emoji URL's idea](https://github.com/jonroig/emojiurlifier). I implemented it on the next.js middleware, so it's a bit cleaner.
