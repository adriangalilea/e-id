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
- [ ] feat: opengraph
- [ ] feat: SEO
- [ ] style: comment input button disabled while not text
- [ ] feat: being able to edit your own profile
  - [ ] flag picker
  - [ ] higlight comment -> testimonial
- [ ] feat: custom auth login window
  - [ ] https://authjs.dev/guides/basics/pages#theming
  - [ ] https://github.com/ndom91/next-auth-example-sign-in-page
- [ ] feat: auth
  - [ ] google
  - [ ] apple passkey
- [ ] feat: being able to choose another username
  - [ ] redirect on the toast to user profile
  - [ ] add warning on username to prompt editing `i your profile is unreachable without username` 
- [ ] feat: API
  - [ ] get
    - [ ] `userByID`
    - [ ] `userByUsername`
  - [ ] post
    - [ ] `patchUser`
- [ ] feat: curl
  - [ ] /adriangalilea
  - [ ] /adriangalilea/x
- [ ] feat: /username/[social_media_name]
  - [ ] if exists: redirects to said social media and log.
  - [ ] if not exists: redirects to e-id profile and log user demand.
- [ ] feat: handle username by auth provider taken
  - [ ] It's null `user.username`
- [ ] feat: list of forbidden handles
  - [x] I don't need auth because it has higher priority than [username]
  - [ ] I'll need the path for setting your username when you don't have one maybe /limbo or /settings
- [ ] feat: premium analytics (Tinybird)
- [ ] consider cheap username fee/time to prevent squatting.
  - [ ] allow speculation (?)
- [ ] allow befriending/following
- [ ] consider tracking for every social media
  - [ ] default being only the last element
  - [ ] aliveness score
  - [ ] notify when friends make new places
- [ ] feat: premium claimable username

- [x] feat: dub.co license
- [x] fix: flash of mobile menu
- [x] feat: signup
- [x] feat: auth on every domain
- [x] feat: display profile info, minimal style.
- [x] feat: sign in on mobile
- [x] feat: comments on profile
- [x] feat: preserve user email
- [x] fix: username taken warning on a non logged-in user

# Credits
[Progressive enhancement emoji URL's idea](https://github.com/jonroig/emojiurlifier). I implemented it on the next.js middleware, so it's a bit cleaner.
