import type { Metadata } from "next";
import type { Holder } from "@/components/id-card";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { getShowcase } from "@/lib/data";
import { UnlessForming } from "@/components/landing/hero-cards";
import { LatestUsers } from "@/components/latest_users/latest_users";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Page() {
  // The card the features show: the hero's lead, a real one.
  const [first] = await getShowcase();
  if (!first) throw new Error("the home has no card to show");
  const lead: Holder = {
    name: first.name,
    username: first.username,
    image: first.image,
    country: first.country_code,
    bio: first.bio,
    places: first.places,
  };
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      {/* Gone once the visitor's card becomes their profile: the page is then
          that profile alone, as a profile's page is. */}
      <UnlessForming>
        <Features holder={lead} />
        <LatestUsers />
      </UnlessForming>
    </div>
  );
}
