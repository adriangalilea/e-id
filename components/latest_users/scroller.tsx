"use client";

import { useRef } from "react";
import { NO_SCROLLBAR, ScrollThumbs } from "@/components/ui/scroll-thumb";
import { cn } from "@/lib/utils";

/** A long list's scroller: the registry's overlay thumbs, never the browser's bar.
 *  Where the className gives it no overflow it is a plain box and shows none. */
export function Scroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={cn(NO_SCROLLBAR, className)}>
      <ScrollThumbs scroller={ref} />
      {children}
    </div>
  );
}
