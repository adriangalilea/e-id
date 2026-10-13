import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { LatestUsersTable } from "@/components/latest_users/latest_users_table";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Page() {
  return (
    <div className="flex h-full flex-col gap-8">
      <Hero />
      <LatestUsersTable />
    </div>
  );
}
