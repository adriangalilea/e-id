"use client"

import { MARK_MASK } from "@/lib/quote-card"

// THE QUOTATION MARK'S OUTLINE, ONCE PER PAGE: `--ag-quote-mark-mask` on the root, in a
// style React hoists into the head once however many quotes render it (its `href`).
// Each mark is a span painted in its quote's ink through that mask. A client module on
// purpose: a server component's output travels in the page's payload once per render,
// so from the server the 876-byte outline rode along with every quote again; a client
// component travels as a reference and draws the style itself.

export function QuoteMarkMask() {
  return (
    <style href="ag-quote-mark-mask" precedence="default">
      {`:root{--ag-quote-mark-mask:${MARK_MASK}}`}
    </style>
  )
}
