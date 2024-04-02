import { LatestUsersTable } from "@/components/latest_users/latest_users_table";
import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/latest_users/skeleton";

export default async function Page() {
  return (
    <div className="h-full flex justify-between">
      <Suspense fallback={<LoadingSkeleton />}>
        <LatestUsersTable />
      </Suspense>
    </div>
  );
}
