import type { Metadata } from "next"
import { Features } from "@/components/landing/features"
import { Hero } from "@/components/landing/hero"
import { UnlessForming } from "@/components/landing/hero-cards"
import { LatestUsers } from "@/components/latest_users/latest_users"

export const metadata: Metadata = { alternates: { canonical: "/" } }

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      {/* Gone once the visitor's card becomes their profile: the page is then
          that profile alone, as a profile's page is. */}
      <UnlessForming>
        <Features />
        <LatestUsers />
      </UnlessForming>
    </div>
  )
}
