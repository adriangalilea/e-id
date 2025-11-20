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
import { ClickableTableRow } from "./clickable_table_row";

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
          <TableRow key={user.id}>
            <TableCell>
              <ClickableTableRow href={`/${user.username}`}>
                <Flag country={user.country_code} />
              </ClickableTableRow>
            </TableCell>
            <TableCell className="prose prose-zinc dark:prose-invert text-sm">
              <ClickableTableRow href={`/${user.username}`}>
                {user.name}
              </ClickableTableRow>
            </TableCell>
            <TableCell className="prose prose-zinc dark:prose-invert text-sm">
              <ClickableTableRow href={`/${user.username}`}>
                <HumanTime date={user.createdAt} />
              </ClickableTableRow>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
