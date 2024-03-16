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
import { ReactCountryFlag } from "react-country-flag";
import HumanTime from "@/components/human_date";
import Link from "next/link";

export function LatestUsersTable({
  users,
}: {
  users: SelectUser[];
}) {
  return (
    <Table className="w-fill">
      <TableCaption>A list of the latest users.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>user</TableHead>
          <TableHead>Bio</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              <Link
                href={`/${user.id}`}
                className="no-underline hover:underline"
              >
                {user.name} <span className="font-light opacity-80">@{user.username}</span>
              </Link>
            </TableCell>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              {user.bio}
            </TableCell>
            <TableCell>
              <ReactCountryFlag
                svg
                countryCode={user.country_code}
                title={user.country_code}
                aria-label={`${user.country_code} country flag`}
                style={{
                  width: "1.5em",
                  height: "1.5em",
                }}
              />
            </TableCell>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              <HumanTime date={new Date(user.created_at)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
