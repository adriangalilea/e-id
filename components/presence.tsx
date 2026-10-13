"use client";

import { useLayoutEffect } from "react";

// What a page SHOWS is told to the stylesheet by an effect, never by what the
// document merely contains: Next keeps a page you left mounted (React's
// <Activity>), hidden, to restore it, so a selector like `:has([data-slot=hero])`
// still matched the home's hero while /about was on screen. An effect runs while
// its component is shown and is cleaned up when Activity hides it.
//
// Before React owns the page there are no effects, so the stylesheet trusts the
// document until the hero's effect has run once (`data-hero-known`). ONE owner
// flips both marks, in one effect: a mark set by anything else (the layout
// saying "hydrated") ran a frame before the hero's and left a frame where
// neither said hero, and the page jumped (globals.css, `hero`).

/** Marks `<html data-hero>` while the home's hero is shown. */
export function HeroShown() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hero-known", "");
    root.setAttribute("data-hero", "");
    return () => root.removeAttribute("data-hero");
  }, []);
  return null;
}
