"use client";

import { Pen } from "lucide-react";
import { useOwnCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import ShareButton from "./share_button";

/** Share and edit, for the profile's owner as the display cookie remembers them
 *  (components/profile-card, `useOwnCard`). Edit takes up the card itself; saving
 *  checks the real session. */
export function OwnerActions({ username }: { username: string }) {
  const own = useOwnCard();
  if (!own) return null;

  return (
    <div className="flex animate-fade-in gap-2">
      <ShareButton username={username} />
      <Button
        variant="outline"
        size="lg"
        loading={own.opening}
        onClick={own.open}
        icon={<Pen strokeWidth={1.5} />}
      >
        edit
      </Button>
    </div>
  );
}
