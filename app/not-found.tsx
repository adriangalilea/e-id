import type { Metadata } from "next"
import { Missing } from "@/components/notice"

// Every address with nothing behind it: no route at all, and a profile's address
// no one holds (app/[username], `notFound()`). Which of the two it is, the page
// reads from the address (components/notice).

export const metadata: Metadata = { title: "not found" }

export default function NotFound() {
  return <Missing />
}
