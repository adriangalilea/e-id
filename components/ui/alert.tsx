"use client"

// A callout in the page's flow: something the reader should know where they are
// reading, said once, never a popup. shadcn's alert, with its kinds as the registry's
// tones:
//
//   default      a note, in the text's own colour
//   success      it worked (tone-ok)
//   warning      look before going on (tone-warn)
//   destructive  it failed, or it will destroy something (tone-bad)
//
// Each kind wears ONE colour everywhere, alpha the only variable: its icon and title
// in it, its surface a faint wash of it, its edge fainter still; the description stays
// in the text's neutral colour. An icon of the page's own is drawn at the title's
// height (`icon`; each kind has one by default, `icon={null}` for none); `action`
// sits at the end (undo, retry). A callout of the page is read with the page, no live
// region; one that appears because something happened says so (`live`): a
// destructive one at once (role="alert"), the rest when the reader can (role=status).
//
// Two materials (`material`): plain, a wash on the page; glass, a pane of the
// material's glass stained with the kind's colour.

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import type * as React from "react"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import {
  glassStyle,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass"
import { cn } from "@/lib/utils"

export type AlertKind = "default" | "success" | "warning" | "destructive"

/** Each kind's colour, as the tokens name it; default is the text's own. */
const INK: Record<AlertKind, string> = {
  default: "currentColor",
  success: "var(--tone-ok)",
  warning: "var(--tone-warn)",
  destructive: "var(--tone-bad)",
}

const ICON: Record<AlertKind, React.ReactNode> = {
  default: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  destructive: <CircleAlert />,
}

export interface AlertProps extends Omit<React.ComponentProps<"div">, "title"> {
  kind?: AlertKind
  title?: React.ReactNode
  /** The icon at the title's height; each kind has one, `null` for none. */
  icon?: React.ReactNode | null
  /** At the end: a verb the reader can answer with (undo, retry). */
  action?: React.ReactNode
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** It appeared because something happened (a save failed, a retry worked): a
   *  screen reader says it as it comes, a destructive one at once (`role=alert`),
   *  the rest when it can (`role=status`). Off, it is a callout of the page, read
   *  with the page like any paragraph, no live region. */
  live?: boolean
}

export function Alert({
  kind = "default",
  title,
  icon,
  action,
  material,
  scheme,
  live = false,
  className,
  style,
  children,
  ref,
  ...props
}: AlertProps) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  const ink = INK[kind]
  const glyph = icon === undefined ? ICON[kind] : icon
  return (
    <div
      ref={here}
      data-slot="alert"
      data-kind={kind}
      data-material={m}
      role={live ? (kind === "destructive" ? "alert" : "status") : undefined}
      className={cn(
        schemeOf(s),
        m === "glass"
          ? [
              glassVariants({ shape: "surface" }),
              "[--glass-radius:--theme(--radius-2xl)]",
            ]
          : // The wash and the edge are the kind's colour at alpha, the edge at or
            // below the wash so the fill carries it.
            "rounded-xl border border-(--ag-alert-ink)/12 bg-(--ag-alert-ink)/6",
        "flex items-start gap-3 px-4 py-3 text-sm",
        className,
      )}
      style={
        {
          "--ag-alert-ink": ink,
          ...(m === "glass" && kind !== "default"
            ? glassStyle({ tint: ink })
            : {}),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* What is inside stands on the alert: it wears the alert's scheme, whatever
          decided it (a picture under the alert included). */}
      <MaterialProvider scheme={s}>
        {glyph && (
          <span
            aria-hidden
            data-slot="alert-icon"
            className="mt-0.5 grid size-4 shrink-0 place-items-center text-(--ag-alert-ink) [&_svg]:size-4"
          >
            {glyph}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title && (
            <p
              data-slot="alert-title"
              className="font-medium text-(--ag-alert-ink) leading-5"
            >
              {title}
            </p>
          )}
          {children && (
            <div
              data-slot="alert-description"
              className="text-current/70 leading-5"
            >
              {children}
            </div>
          )}
        </div>
        {action && (
          <div data-slot="alert-action" className="-my-0.5 shrink-0">
            {action}
          </div>
        )}
      </MaterialProvider>
    </div>
  )
}
