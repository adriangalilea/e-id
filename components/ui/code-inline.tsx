import type { ComponentPropsWithRef } from "react"
import { cn } from "@/lib/utils"

/** Plain inline code for names and short expressions within prose.
 * Use Code with compact and lang for syntax-highlighted command rows. */
export function InlineCode({
  children,
  className,
  ...props
}: ComponentPropsWithRef<"code">) {
  return (
    <code
      {...props}
      data-slot="code-inline"
      className={cn(
        "rounded-md bg-foreground/6 px-1.5 py-0.5 font-mono text-[0.875em] text-foreground/85",
        className,
      )}
    >
      {children}
    </code>
  )
}
