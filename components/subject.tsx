import type * as React from "react"
import { cn } from "@/lib/utils"

// THE ONE THING A PAGE IS ABOUT, told the same way wherever a page is about one
// (a link's preview, the CLI's page; components/profile-layout `SUBJECT`): where it
// is, a line saying what it does, then the thing itself at the page's largest
// type. A command it asks for is ui's `Code` (`compact lang="sh"`, its copy with it).

/** The head of the page's subject: `at` (its address, small and mono), `says` (what
 *  it does, "goes to", "is sending you"), the thing in large type (the page's h1),
 *  and under it what makes it exact (the full address, a size). */
export function SubjectHead({
  at,
  says,
  children,
  under,
  className,
}: {
  at?: React.ReactNode
  says?: React.ReactNode
  children: React.ReactNode
  under?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-2", className)}>
      {at && <span className="font-mono text-foreground/45 text-sm">{at}</span>}
      {says && <span className="text-foreground/60 text-lg">{says}</span>}
      <h1 className="text-balance break-words font-medium text-4xl tracking-tight sm:text-5xl">
        {children}
      </h1>
      {under && (
        <div className="break-all font-mono text-foreground/55 text-sm">
          {under}
        </div>
      )}
    </header>
  )
}
