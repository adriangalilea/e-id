"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export function DiscardButton({ username }: { username: string }) {
  return (
    <Button
      variant="ghost"
      asChild
      className="self-end hover:bg-red-500/10 hover:text-red-500"
    >
      <Link href={`/${username}`}>
        <X strokeWidth={1} size="18" />
        <span className="ml-2">discard</span>
      </Link>
    </Button>
  );
}
