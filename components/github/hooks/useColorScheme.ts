"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

export function useColorScheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(query).matches ? "dark" : "light"),
    () => "light",
  );
}
