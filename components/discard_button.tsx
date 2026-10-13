"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export function DiscardButton({ username }: { username: string }) {
  return (
    <Button
      variant="ghost"
      size="lg"
      render={<Link href={`/${username}`} />}
      className="self-end hover:bg-tone-bad/15 hover:text-tone-bad"
    >
      <X strokeWidth={1} />
      discard
    </Button>
  );
}
