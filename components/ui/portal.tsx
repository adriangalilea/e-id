"use client"

import * as React from "react"

// WHERE A POPUP GOES. A popup (a tooltip, a popover, a menu, a select's list, a
// dialog) is portalled out of the flow, to the page's body by default. A surface that
// shows on its own declares where the popups inside it go instead, once: a player in
// fullscreen (only the fullscreen element is drawn, so a popup on the body is
// invisible), a frame that clips, a layer above a picture. Every popup item in the
// registry reads it as its default `container`; one given a `container` of its own
// still goes there.
//
//   <PortalTarget element={layerElement}>
//     … every Tip, Popover, Menu, Select and Dialog inside portals into it
//   </PortalTarget>
//
// Surfaces nest: the nearest declaration wins, and a surface hands the popups on to
// the one around it by declaring that one (`usePortalTarget()`) instead of its own,
// as the player does while it is not fullscreen. No declaration, or an element not
// mounted yet, is the body: `usePortalTarget` says undefined then, never null,
// because Base UI's Portal reads a null container as one still to come and renders
// nothing (every popover outside a player stayed shut when it was null).

const PortalTargetContext = React.createContext<HTMLElement | null>(null)

/** Popups inside go into `element` (null or undefined: the page's body). */
export function PortalTarget({
  element,
  children,
}: {
  element: HTMLElement | null | undefined
  children: React.ReactNode
}) {
  return (
    <PortalTargetContext.Provider value={element ?? null}>
      {children}
    </PortalTargetContext.Provider>
  )
}

/** Where a popup here goes: the nearest `PortalTarget`'s element, else undefined
 *  (the body). A popup item's default `container`. */
export function usePortalTarget(): HTMLElement | undefined {
  return React.useContext(PortalTargetContext) ?? undefined
}
