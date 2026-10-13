import type { Metadata } from "next";
import { LatestUsersTable } from "@/components/latest_users/latest_users_table";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Page() {
  return (
    <div className="h-full flex justify-between">
      <LatestUsersTable />
    </div>
  );
}
