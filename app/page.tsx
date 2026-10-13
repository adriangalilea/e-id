import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { LatestUsers } from "@/components/latest_users/latest_users";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <LatestUsers />
    </div>
  );
}
