import type { CardLink } from "@/lib/link-names"

// THE HOME'S EXAMPLE CARDS: historical figures who fill the hero's pile where
// too few real people have a whole card yet (a photo, a name, a country). Real
// cards always come first (lib/data, `getShowcase`); these only fill what is
// left, and never stand for an account: there is no profile at their address.
// Their portraits are Wikipedia's page images, free to reuse, kept in
// public/showcase (where each came from, below); their one link is their
// Wikipedia page.

export type ShowcaseCard = {
  name: string
  username: string
  image: string
  country_code: string
  bio: string | null
  links: CardLink[]
}

const example = (
  name: string,
  username: string,
  image: string,
  country_code: string,
  wikipedia: string,
): ShowcaseCard => ({
  name,
  username,
  image: `/showcase/${image}`,
  country_code,
  bio: null,
  links: [
    {
      platform: "link",
      name: "Wikipedia",
      url: `https://en.wikipedia.org/wiki/${wikipedia}`,
    },
  ],
})

/** In the order they fill the pile. Portraits (Wikimedia Commons):
 *  Ada_Lovelace_daguerreotype_by_Antoine_Claudet_1843_-_cropped.png,
 *  Tesla_circa_1890.jpeg, Marie_Curie_c._1920s.jpg,
 *  Albert_Einstein_Head_cleaned.jpg,
 *  Commodore_Grace_M._Hopper,_USN_(covered)_head_and_shoulders_crop.jpg,
 *  Alan_turing_header.jpg, Charles_Darwin_seated_crop.jpg,
 *  Francesco_Melzi_-_Portrait_of_Leonardo_(colour_correction).png,
 *  Hedy_Lamarr_Publicity_Photo_for_The_Heavenly_Body_1944.jpg,
 *  Portrait_of_Sir_Isaac_Newton,_1689_(brightened).jpg. */
export const SHOWCASE_EXAMPLES: ShowcaseCard[] = [
  example(
    "Ada Lovelace",
    "adalovelace",
    "adalovelace.png",
    "GB",
    "Ada_Lovelace",
  ),
  example(
    "Nikola Tesla",
    "nikolatesla",
    "nikolatesla.jpg",
    "RS",
    "Nikola_Tesla",
  ),
  example("Marie Curie", "mariecurie", "mariecurie.jpg", "PL", "Marie_Curie"),
  example(
    "Albert Einstein",
    "alberteinstein",
    "alberteinstein.jpg",
    "DE",
    "Albert_Einstein",
  ),
  example(
    "Grace Hopper",
    "gracehopper",
    "gracehopper.jpg",
    "US",
    "Grace_Hopper",
  ),
  example("Alan Turing", "alanturing", "alanturing.jpg", "GB", "Alan_Turing"),
  example(
    "Charles Darwin",
    "charlesdarwin",
    "charlesdarwin.jpg",
    "GB",
    "Charles_Darwin",
  ),
  example(
    "Leonardo da Vinci",
    "leonardodavinci",
    "leonardodavinci.png",
    "IT",
    "Leonardo_da_Vinci",
  ),
  example("Hedy Lamarr", "hedylamarr", "hedylamarr.jpg", "AT", "Hedy_Lamarr"),
  example(
    "Isaac Newton",
    "isaacnewton",
    "isaacnewton.jpg",
    "GB",
    "Isaac_Newton",
  ),
]
