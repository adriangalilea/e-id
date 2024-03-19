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
- [x] feat: signup and auth on every domain
- [ ] feat: list of forbidden handles
- [ ] feat: sign in on mobile
- [ ] feat: comments on profile
- [ ] feat: being able to claim another username if your auth provider one is taken
- [ ] feat: premium analytics (tinybird)
- [ ] feat: /username/[social_media_name]
  - [ ] if exists: redirects to said social media and log.
  - [ ] if not exists: redirects to e-id profile and log user demand.
- [ ] feat: API
  - [ ] get
    - [ ] userByID
    - [ ] userByUsername
  - [ ] post
    - [ ] patchUser
- [ ] consider cheap username fee/time to prevent squatting.
  - [ ] allow speculation (?)
- [ ] allow befriending/following
- [ ] consider tracking for every social media
  - [ ] default being only the last element
  - [ ] aliveness score
  - [ ] notify when friends make new places
- [ ] feat: premium claimable username

# Credits
[Progressive enhancement emoji URL's idea](https://github.com/jonroig/emojiurlifier). I implemented it on the next.js middleware so it's a bit cleaner.