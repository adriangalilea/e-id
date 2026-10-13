/** A profile's page, laid out once for every place one is drawn: the profile
 *  itself (app/[username]/user_profile) and the home's card as it becomes one
 *  (components/landing/hero-cards, `Stage`), so the two are the same page and
 *  never a likeness of it.
 *
 *  A split in the golden ratio, two different things. WHO, the smaller part
 *  (38.2%): one pane held still under the bar (`side`), the card on top of it
 *  (`identity`). WHERE, the larger (61.8%): the person's places, the page that
 *  scrolls (`places`). On a phone: the card, the places, then the vouches (grid
 *  areas). Framed as a wide page (components/frame, `Wide`) whose own padding
 *  is none on a wide screen (`frame`): the pane starts right under the bar and
 *  runs to the screen's foot, or the page outgrows the screen and the held pane
 *  slides under the bar. */
export const PROFILE = {
  frame: "py-10 sm:py-16 lg:py-0",
  grid: "grid gap-10 [grid-template-areas:'id'_'places'_'vouch'] lg:grid-cols-[minmax(0,38.2fr)_minmax(0,61.8fr)] lg:[grid-template-areas:'side_places']",
  side: "max-lg:contents lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-8rem)] lg:min-h-0 lg:flex-col lg:gap-10 lg:self-start lg:[grid-area:side]",
  identity: "flex flex-col gap-5 max-lg:[grid-area:id]",
  places: "flex min-w-0 flex-col gap-16 [grid-area:places]",
} as const;
