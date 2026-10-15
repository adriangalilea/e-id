"use client"

// A dialog on Base UI (focus trapped and returned, Esc and an outside press close
// it, a title for screen readers), the parts named as shadcn names them so code
// written for shadcn composes it:
//
//   <Dialog>
//     <DialogTrigger render={<button />}>edit</DialogTrigger>
//     <DialogContent>
//       <DialogHeader>
//         <DialogTitle>smile</DialogTitle>
//         <DialogDescription>gemma, four frames a second</DialogDescription>
//       </DialogHeader>
//       …
//     </DialogContent>
//   </Dialog>
//
// Two places it can stand, `<Dialog place>`:
//   center  over the page, the page dimmed and held behind it: a decision to make
//   side    a panel along the right edge, the page live beside it: settings you
//           change while watching what they do (a threshold dragged while the
//           timeline under it re-cuts). Nothing is dimmed, nothing is held, and
//           pressing the page does not close it.
// It never shifts the page: no scroll-lock padding rewrite. Two materials
// (`material` on DialogContent, or a MaterialProvider round it): plain, the page's
// popover surface; glass, the material's glass, heavier blur, dark by default.

import { Dialog as Base } from "@base-ui/react/dialog"
import * as React from "react"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassVariants, schemeOf } from "@/components/ui/material-glass"
import { usePortalTarget } from "@/components/ui/portal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export type DialogPlace = "center" | "side"

const Place = React.createContext<DialogPlace>("center")

/** The place, read by every face's content. */
export const useDialogPlace = () => React.useContext(Place)

/** The dialog's state and its place. At the side it is not modal, and neither a
 *  press on the page nor focus moving there closes it: the page beside it is the
 *  point. `modal` and `disablePointerDismissal` still win when set. */
export function Dialog({
  place = "center",
  ...props
}: React.ComponentProps<typeof Base.Root> & { place?: DialogPlace }) {
  return (
    <Place.Provider value={place}>
      <Base.Root
        modal={place === "center"}
        disablePointerDismissal={place === "side"}
        {...props}
      />
    </Place.Provider>
  )
}

/** What opens it; `render` makes any element the trigger. */
export const DialogTrigger = Base.Trigger

/** What closes it; `render` makes any element the close. */
export const DialogClose = Base.Close

/** Where each place puts the popup, and how it enters. */
export const DIALOG_PLACE: Record<DialogPlace, string> = {
  center:
    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] data-[ending-style]:scale-98 data-[starting-style]:scale-98",
  side: "fixed top-3 right-3 bottom-3 w-[min(24rem,calc(100vw-1.5rem))] data-[ending-style]:translate-x-4 data-[starting-style]:translate-x-4",
}

/** The popup's frame, shared by every face: it stays whole, and its content scrolls
 *  inside it (DIALOG_BODY). */
const DIALOG_FRAME =
  "flex flex-col outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"

/** What the frame holds: it fills the frame and scrolls there, its cut edges fading
 *  where there is more (scroll-area); the room round the content is inside it, so
 *  nothing at its edge (a focus ring) is cut. A dialog scrolling as its frame
 *  faded its own surface, or showed a hard cut. An overlay, so its scroll stops at
 *  its ends rather than moving the page behind it. */
const DIALOG_BODY = "flex flex-1 flex-col gap-4 overscroll-contain p-5"

/** The popup's motion, one per face: the plain face's own transition, the glass
 *  face's through the material, which owns its transition (`--glass-moves`). */
export const DIALOG_MOTION: Record<Material, string> = {
  plain:
    "transition-[opacity,scale,translate] duration-150 ease-out motion-reduce:transition-none",
  glass:
    "[--glass-moves:opacity_150ms_var(--ease-out),scale_150ms_var(--ease-out),translate_150ms_var(--ease-out)]",
}

/** The page behind a modal one, dimmed (a sheet's too). */
export const DIALOG_BACKDROP =
  "fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"

/** The plain face: the page's popover surface, a hairline, a deep shadow. */
const PLAIN_FACE =
  "rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl"

/** The glass face: the material's glass, its blur heavier than a menu's so the
 *  controls in it read over any frame; its own rim and shadows are its edge. Over a
 *  picture it is dark because what opened it stands in the dark scheme (a player's
 *  layer says so), never by a default of its own. The material is `relative` (its
 *  rim's layer hangs off it): the place's `fixed` comes after it. */
const GLASS_FACE = cn(
  glassVariants({ shape: "surface" }),
  "fixed border-0 [--glass-blur:28px] [--glass-radius:20px]",
)

/** A bare dialog's frame: no surface, no room round what it holds, and no motion
 *  of its own, so what it holds is the object and a view transition can carry it
 *  in from where it lay on the page (its snapshot taken whole, never mid-fade). */
const BARE_FRAME =
  "flex flex-col outline-none data-[ending-style]:scale-100 data-[starting-style]:scale-100"

/** The popup, portalled, at the dialog's place: dimming the page behind it only
 *  when it stands in the center. `container`: where it portals (a player's own
 *  layer, so it shows in fullscreen). In its material, and so is everything inside
 *  it. `bare`: no face at all, for an object lifted off the page to be worked on
 *  (a card written on where it lies): still a dialog, focus held, Esc and a press
 *  outside closing it; `backdrop` adds to the dim behind it. */
export function DialogContent({
  container,
  material,
  scheme,
  bare = false,
  backdrop,
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof Base.Popup> & {
  container?: React.ComponentProps<typeof Base.Portal>["container"]
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  /** No surface and no motion: what it holds is the object. */
  bare?: boolean
  /** Classes added to the dim behind a centred one (a stronger dim, a blur). */
  backdrop?: string
}) {
  const place = useDialogPlace()
  const m = useMaterial(material)
  const target = usePortalTarget()
  // Over a picture (a player's layer, in fullscreen) it is read by the part of it
  // under the dialog. Centred, the dim between them darkens that part as it darkens
  // the whole, so the part is still the better witness of what it stands over.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme, ref)
  return (
    <Base.Portal container={container ?? target}>
      {place === "center" && (
        <Base.Backdrop
          data-slot="dialog-backdrop"
          className={cn(DIALOG_BACKDROP, backdrop)}
        />
      )}
      <Base.Popup
        ref={here}
        data-slot="dialog-content"
        data-place={place}
        data-material={bare ? undefined : m}
        data-bare={bare || undefined}
        className={cn(
          DIALOG_PLACE[place],
          "z-50",
          schemeOf(s),
          bare
            ? BARE_FRAME
            : cn(
                DIALOG_FRAME,
                m === "glass" ? GLASS_FACE : PLAIN_FACE,
                DIALOG_MOTION[m],
              ),
          className,
        )}
        {...props}
      >
        <MaterialProvider material={m} scheme={s}>
          {bare ? (
            children
          ) : (
            // Its slot rides on `render`: the scroller's own props name it
            // scroll-area.
            <ScrollArea
              render={<div data-slot="dialog-body" />}
              className={DIALOG_BODY}
            >
              {children}
            </ScrollArea>
          )}
        </MaterialProvider>
      </Base.Popup>
    </Base.Portal>
  )
}

/** The title and description, and the close in the corner. */
export function DialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex items-start gap-3", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      <Base.Close
        data-slot="dialog-close"
        aria-label="close"
        className="-mt-1 -mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-current/55 hover:bg-current/8 hover:text-current"
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="ag-icon size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </Base.Close>
    </div>
  )
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Base.Title>) {
  return (
    <Base.Title
      data-slot="dialog-title"
      className={cn("truncate font-medium text-base leading-6", className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Base.Description>) {
  return (
    <Base.Description
      data-slot="dialog-description"
      className={cn("text-current/55 text-sm", className)}
      {...props}
    />
  )
}

/** A titled group of controls inside the dialog. */
export function DialogSection({
  title,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { title?: React.ReactNode }) {
  return (
    <section
      data-slot="dialog-section"
      className={cn("flex flex-col gap-2.5", className)}
      {...props}
    >
      {title && (
        <h3 className="font-mono text-[11px] text-current/45 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

/** The actions, at the foot, the main one last. */
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-auto flex flex-wrap items-center justify-end gap-2",
        className,
      )}
      {...props}
    />
  )
}
