import type * as React from "react"

// The embed's element (app/embed.js) as JSX knows it, for the page that shows it
// working (components/landing/live-embed).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "e-id-card": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { handle: string; compact?: boolean }
    }
  }
}
