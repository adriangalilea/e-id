import type * as React from "react"
import { cn } from "@/lib/utils"

// THE ONE THING A PAGE IS ABOUT, told the same way wherever a page is about one
// (a link's preview, the CLI's page; components/profile-layout `SUBJECT`): where it
// is, the thing itself at the page's largest type, and what makes it exact. A
// command it asks for is ui's `Code` (`compact lang="sh"`, its copy with it).
//
// Every line is trimmed to its ink (caps to baseline), so the head's first line
// stands exactly on the card's top edge beside it and every gap is the scale's
// own (16 between the head's lines), never a line's empty leading added to it.

const INK = "[text-box:trim-both_cap_alphabetic]"

/** The head of the page's subject: `at` (where it is, small and mono), `says` (what
 *  it does, "goes to", "is sending"), the thing in large type (the page's h1), and
 *  `under` (what makes it exact: the full address, a size) or `lead` (what it is,
 *  in a sentence). */
export function SubjectHead({
  at,
  says,
  children,
  under,
  lead,
  className,
}: {
  at?: React.ReactNode
  says?: React.ReactNode
  children: React.ReactNode
  under?: React.ReactNode
  lead?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4", className)}>
      {at && (
        <span className={cn(INK, "font-mono text-foreground/45 text-sm")}>
          {at}
        </span>
      )}
      {says && (
        <span className={cn(INK, "text-foreground/60 text-lg")}>{says}</span>
      )}
      <h1
        className={cn(
          INK,
          "text-balance break-words font-medium text-4xl tracking-tight sm:text-5xl",
        )}
      >
        {children}
      </h1>
      {under && (
        <div
          className={cn(INK, "break-all font-mono text-foreground/55 text-sm")}
        >
          {under}
        </div>
      )}
      {lead && (
        <p
          className={cn(
            INK,
            "text-pretty text-foreground/60 text-lg leading-relaxed",
          )}
        >
          {lead}
        </p>
      )}
    </header>
  )
}

/** A section of the subject's column: a label in the page's meta voice (mono, as
 *  the profile's "vouched by"), then what it labels. */
export function SubjectSection({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={cn(INK, "font-mono text-foreground/50 text-sm")}>
        {label}
      </h2>
      {children}
    </section>
  )
}
