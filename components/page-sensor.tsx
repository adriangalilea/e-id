"use client";

import { PageSensor } from "@/components/ui/page-sensor";

// e-id's pages in the event stream (ui page-sensor), posted to app/api/events.
// A PLACE is what a reader would call where they are; a ROUTE is the path with
// the username folded, so every profile is one route.

const PLACES: Record<string, string> = { "": "home", about: "about", null: "null" };

function placeOf(path: string) {
  const [, first = "", second] = path.split("/");
  if (first in PLACES) return PLACES[first];
  return second === "edit" ? "edit" : "profile";
}

function routeOf(path: string) {
  const place = placeOf(path);
  if (place === "profile") return "/[username]";
  if (place === "edit") return "/[username]/edit";
  return path;
}

export function SitePageSensor() {
  return (
    <PageSensor
      service="e-id-web"
      collector="/api/events"
      place={placeOf}
      route={routeOf}
    />
  );
}
