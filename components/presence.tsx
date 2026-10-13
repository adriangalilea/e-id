"use client";

import { useLayoutEffect } from "react";

// What a page SHOWS is told to the stylesheet by effects, never by what the
// document merely contains: Next keeps a page you left mounted (React's
// <Activity>), hidden, to restore it, so a selector like `:has([data-slot=hero])`
// still matched the home's hero while /about was on screen and hid the site's bar
// there. An effect runs while its component is shown and is cleaned up when
// Activity hides it, which is exactly "shown". Before React owns the page there
// are no effects, so the stylesheet falls back to the document for the first
// paint (`data-hydrated` says which of the two to trust: globals.css, `hero`).

/** Marks `<html data-hydrated>` once React owns the page. Mounted once, in the
 *  root layout. */
export function Hydrated() {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);
  return null;
}

/** Marks `<html data-hero>` while the home's hero is shown. */
export function HeroShown() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hero", "");
    return () => root.removeAttribute("data-hero");
  }, []);
  return null;
}
