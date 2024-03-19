⚠️ WIP

e-ID is your dynamic digital business card.

A constant pointer to your ever changing web presence.

# ⭐ Features
- Emoji domain to standout.
  - [👤️️.to](xn--mq8h.to)
- **Interchangeable Domains**
  - [e-id.to](https://e-id.to)
  - [eid.to](https://eid.to)
  - [👤️️.to](https://👤️️.to)
- **Progressive enhancing browsers that support emoji domain** 
  - [e-id.to](https://e-id.to) and [eid.to](https://eid.to) redirect to [👤️️.to](https://👤️️.to) in safari
  - [👤️️.to](https://👤️️.to) redirects to [e-id.to](https://e-id.to) in anything else.

# 📝 TO-DO
- [ ] feat: comments on profile
- [ ] feat: being able to edit your own profile
- [ ] feat: custom auth login window
  - [ ] https://authjs.dev/guides/basics/pages#theming
  - [ ] https://github.com/ndom91/next-auth-example-sign-in-page
- [ ] feat: add google
- [ ] feat: being able to choose another username
- [ ] feat: API
  - [ ] get
    - [ ] userByID
    - [ ] userByUsername
  - [ ] post
    - [ ] patchUser
- [ ] feat: /username/[social_media_name]
  - [ ] if exists: redirects to said social media and log.
  - [ ] if not exists: redirects to e-id profile and log user demand.
- [ ] feat: handle username by auth provider taken
  - [ ] It's null `user.username`
- [ ] feat: list of forbidden handles
  - [x] I don't need auth because it has higher priority than [username]
  - [ ] I'll need the path for setting your username when you don't have one maybe /limbo or /settings
- [ ] feat: premium analytics (tinybird)
- [ ] consider cheap username fee/time to prevent squatting.
  - [ ] allow speculation (?)
- [ ] allow befriending/following
- [ ] consider tracking for every social media
  - [ ] default being only the last element
  - [ ] aliveness score
  - [ ] notify when friends make new places
- [ ] feat: premium claimable username

- [x] feat: signup
- [x] feat: auth on every domain
- [x] feat: display profile info, minimal style.
- [x] feat: sign in on mobile

# Credits
[Progressive enhancement emoji URL's idea](https://github.com/jonroig/emojiurlifier). I implemented it on the next.js middleware so it's a bit cleaner.