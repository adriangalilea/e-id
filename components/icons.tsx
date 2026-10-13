import { createLucideIcon } from "lucide-react";

/** A question mark alone, for a control whose own round face is the circle (the
 *  bar's faq): lucide has it only inside a circle, a badge or a bubble. These are
 *  lucide's own two strokes from `circle-question-mark`, scaled 1.45 about the
 *  glyph's centre (12, 11.5) to fill the box the circle no longer takes, so it
 *  keeps lucide's stroke, caps and joins. */
export const QuestionMark = createLucideIcon("question-mark", [
  [
    "path",
    {
      d: "M7.78 7.875a4.35 4.35 0 0 1 8.4535 1.45c0 2.9-4.35 4.35-4.35 4.35",
      key: "hook",
    },
  ],
  ["path", { d: "M12 19.475h.01", key: "dot" }],
]);
