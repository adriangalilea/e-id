import Link from "next/link";
import type { ReactNode } from "react";

interface ClickableTableRowProps {
  href: string;
  children: ReactNode;
}

export function ClickableTableRow({
  href,
  children,
}: ClickableTableRowProps) {
  return (
    <Link href={href} className="block no-underline">
      {children}
    </Link>
  );
}
