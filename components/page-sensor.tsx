"use client"

import { PageSensor } from "@/components/ui/page-sensor"

// e-id's pages in the event stream (ui page-sensor), posted to app/api/events.
// A PLACE is what a reader would call where they are; a ROUTE is the path with
// the username folded, so every profile is one route.

const PLACES: Record<string, string> = { "": "home", admin: "admin" }

function placeOf(path: string) {
  const [, first = ""] = path.split("/")
  return first in PLACES ? PLACES[first] : "profile"
}

function routeOf(path: string) {
  return placeOf(path) === "profile" ? "/[username]" : path
}

export function SitePageSensor() {
  return (
    <PageSensor
      service="e-id-web"
      collector="/api/events"
      place={placeOf}
      route={routeOf}
    />
  )
}
