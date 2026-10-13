import { glassVariants } from "@/components/ui/material-glass";
import { cn } from "@/lib/utils";

// The layers e-id stands things on, both the one glass material (@ag/material):
// a frosted body over the page's light, lit along its edge where it faces the
// light. A glass inside a glass is told so by the material itself (`--glass-body`)
// and carries less body and less edge, so the two layers read apart without a
// second recipe here. A registry card handed one of these keeps its layout and
// trades its own fill and border for the glass.

/** What stands on the page: a panel, the sign-ups ledger, a testimonial. */
export const SURFACE = cn(
  glassVariants({ shape: "surface" }),
  "border-transparent [--glass-radius:var(--radius-2xl)]",
);

/** What stands inside a panel or on its own in a column: a registry card (a post,
 *  a profile, a preview). */
export const INSET = cn(
  glassVariants({ shape: "surface" }),
  "border-transparent [--glass-radius:var(--radius-xl)]",
);
