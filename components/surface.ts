// The layers e-id stands things on, one home for each. Every layer is the page's
// light falling on a sheet: lighter at its top edge than at its foot, a catch of
// light along that top edge, and a hairline round it. A layer is a step brighter
// than the one under it, so a panel reads on the page and a card on the panel.

/** What stands on the page: a panel, the sign-ups ledger, a testimonial. */
export const SURFACE =
  "border border-white/10 bg-linear-to-b from-white/[0.065] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_24px_48px_-28px_rgb(0_0_0/0.9)]";

/** What stands inside a panel: a registry card (a post, a profile, a preview),
 *  its hover a step brighter instead of the darker one its own colours mix. */
export const INSET =
  "border-white/10 bg-white/[0.045] hover:bg-white/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]";
