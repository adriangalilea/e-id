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
import { getName } from "country-list";

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
            <TableCell className="text-center">
              <ReactCountryFlag
                svg
                countryCode={user.country_code}
                title={getName(user.country_code)}
                aria-label={`${getName(user.country_code)} country flag`}
                style={{
                  width: "1.5em",
                  height: "1.5em",
                }}
              />
            </TableCell>
            <TableCell className="prose dark:prose-invert prose-zinc antialiased text-sm">
              <Link
                href={`/${user.id}`}
                className="no-underline hover:underline"
              >
                {user.name}{" "}
                <span className="font-light opacity-80">@{user.username}</span>
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
