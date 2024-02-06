e-ID is your digital business card.

# ⭐ Features
- **Minimalist Design**
- **Interchangeable Domains** e-id.to, eid.to, and the visually unique emoji domain [👤️️.to](xn--mq8h.to) all point to your profile e-id.to/profile eid.to/profile [👤️️.to/profile](xn--mq8h.to/profile)
- **Easy Setup**
- **No data storage** Literally, we don't even use a database, your data is compressed and encoded which ends up being the url itself, try it out yourself and inspect the code if you wish, after extensively testing(2 hours and chatgpt) several compression and encoding methods, and arrived at the conclusion that base64-url and brotli.
- **Progressive enhancing browsers that support emoji domain** Preserves the slug so it works without hiccups. [Idea credit](https://github.com/jonroig/emojiurlifier) but implemented using middleware on next so it's a bit cleaner.
  - e-id.to and eid.to redirect to 👤️️️️.to in safari
  - 👤.to redirects to e-id.to in anything else.



⚠️ This is a work in progress.

# 📝 TO-DO
- [ ] style: generation UI
- [ ] chore: add testing write-up and code
- [ ] feat: improve faq
- [ ] style: improve dark theme contrast
- [ ] style: coherent card styles
- [ ] feat: reddit/blog post
- [ ] feat: remove the notion of brotli client side to clean-up the code since it does not offer much.
- [ ] feat: encode profile image (would require image hosting because encoding it would produce a massive slug)
- [ ] feat: wishlist
- [ ] feat: premium analytics
- [ ] feat: premium claimable username
- [x] style: responsive
- [x] style: [slug] page
- [x] feat: progressive enhancing browsers that support emoji domain
- [x] feat: faq section
- [x] feat: array data model
- [x] chore: test requested [HS256](https://pypi.org/project/python-jose/)

# Testing
![telegram-cloud-photo-size-4-5899819325966110101-y](https://github.com/adriangalilea/e-id/assets/90320947/a06d37a0-54b9-4aec-ae14-a096bcac31f9)
