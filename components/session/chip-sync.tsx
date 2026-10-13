"use client";

import { useEffect } from "react";
import type { Chip } from "@/lib/chip";
import { writeChip } from "./use-chip";

/** Puts the real session, read by a signed-in page on the server, into the
 *  display cookie. */
export function ChipSync({ chip }: { chip: Chip | null }) {
  useEffect(() => {
    writeChip(chip);
  }, [chip]);
  return null;
}
