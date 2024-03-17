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
            <TableCell >
              <Flag country={user.country_code} />
            </TableCell>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              <Link
                href={`/${user.id}`}
                className="no-underline hover:underline"
              >
                {user.name}
              </Link>
            </TableCell>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              <HumanTime date={user.created_at} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
