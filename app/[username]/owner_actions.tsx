"use client";

import Link from "next/link";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChip } from "@/components/session/use-chip";
import ShareButton from "./share_button";

/** Share and edit, for the profile's owner as the display cookie remembers them.
 *  The edit page checks the real session. */
export function OwnerActions({ username }: { username: string }) {
  const chip = useChip();
  if (chip?.u?.toLowerCase() !== username.toLowerCase()) return null;

  return (
    <div className="flex items-center justify-end gap-2 animate-fade-in">
      <ShareButton username={username} />
      <Button asChild variant="outline">
        <Link href={`/${username}/edit`} prefetch={false}>
          <Pen strokeWidth={1} />
          <span className="prose prose-zinc dark:prose-invert font-light">
            edit
          </span>
        </Link>
      </Button>
    </div>
  );
}
