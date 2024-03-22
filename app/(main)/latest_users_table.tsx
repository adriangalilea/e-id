"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectUser } from "@/db/schema";
import HumanTime from "@/components/human_date";
import Link from "next/link";
import Flag from "@/components/flag";

export function LatestUsersTable({ users }: { users: SelectUser[] }) {
  return (
    <Table className="w-fill">
      <TableCaption>latest sign-ups</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>country</TableHead>
          <TableHead>user</TableHead>
          <TableHead>time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <Flag country={user.country_code} />
            </TableCell>
            <TableCell className="prose prose-zinc text-sm dark:prose-invert">
              <Link
                href={`/${user.username}`}
                className="no-underline hover:underline"
              >
                {user.name}
              </Link>
            </TableCell>
            <TableCell className="prose prose-zinc text-sm dark:prose-invert">
              <HumanTime date={user.created_at} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
