import type { TweetAuthor, TweetRun } from "@/lib/tweet-data"

// A PROFILE ON X, as facts (`ui/x-profile` draws it as X does): the header of
// x.com/<handle>, the banner, the face, the names, the bio, the line of what they
// are (where, their website, since when) and the two counts. Written by hand: X
// has no read of a profile without an account (the syndication endpoint `tweet`
// reads answers per post, with the author's name and face only).

export interface XProfile {
  /** The profile's page, x.com/<handle>. */
  url: string
  /** The name, the handle, the face and its badge: a post's author's (`tweet`). */
  author: TweetAuthor
  /** The banner, 3:1 as X crops it; none, X's grey. */
  banner?: string
  /** The bio as runs, its mentions and links each with what X shows for it. */
  bio: TweetRun[]
  location?: string
  /** The website as X shows it (`text`: no scheme, an IDN in its own letters,
   *  `👤.to/you`) and the address it opens. */
  website?: { text: string; href: string }
  /** When the account was made, ISO 8601: X says the month and year. */
  joined?: string
  /** The counts, both or neither: a drawing that does not know them (a guide
   *  showing a person their own profile) leaves the row out, never a made-up 0. */
  counts?: { following: number; followers: number }
}
