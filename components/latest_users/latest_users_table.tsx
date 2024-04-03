import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import HumanTime from "@/components/human_date";
import Link from "next/link";
import Flag from "@/components/flag";
import { getLatestUsersWithUsernameCached } from "@/db/actions";

export async function LatestUsersTable() {
  const users = await getLatestUsersWithUsernameCached();
  return (
    <Table>
      <TableCaption className="font-code text-left">
        latest sign-ups
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>country</TableHead>
          <TableHead>user</TableHead>
          <TableHead>time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <Link key={user.id} href={`/${user.username}`} legacyBehavior={true}>
            <TableRow className="cursor-pointer">
              <TableCell>
                <Flag country={user.country_code} />
              </TableCell>
              <TableCell className="prose prose-zinc dark:prose-invert text-sm">
                {user.name}
              </TableCell>
              <TableCell className="prose prose-zinc dark:prose-invert text-sm">
                <HumanTime date={user.created_at} />
              </TableCell>
            </TableRow>
          </Link>
        ))}
      </TableBody>
    </Table>
  );
}
