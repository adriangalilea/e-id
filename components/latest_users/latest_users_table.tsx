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
import Flag from "@/components/flag";
import { getLatestUsersWithUsernameCached } from "@/db/actions";
import Link from "next/link";

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
          <TableRow key={user.id} className="cursor-pointer">
            <TableCell className="p-0">
              <Link href={`/${user.username}`} className="block no-underline px-4 py-2">
                <Flag country={user.country_code} />
              </Link>
            </TableCell>
            <TableCell className="prose prose-zinc dark:prose-invert text-sm p-0">
              <Link href={`/${user.username}`} className="block no-underline px-4 py-2">
                {user.name}
              </Link>
            </TableCell>
            <TableCell className="prose prose-zinc dark:prose-invert text-sm p-0">
              <Link href={`/${user.username}`} className="block no-underline px-4 py-2">
                <HumanTime date={user.createdAt} />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
