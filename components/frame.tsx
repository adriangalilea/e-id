import { cn } from "@/lib/utils"

/** The page's side margins, one value for the home's grid, every column and the
 *  footer, so their edges line up. */
export const GUTTER = "px-5 sm:px-8"

/** A page laid out on the site's full width (a profile's card and its links). */
export function Wide({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col py-10 sm:py-16",
        GUTTER,
        className,
      )}
    >
      {children}
    </div>
  )
}

/** A page that reads as one column: the faq, choosing a username. */
export function Column({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-1 flex-col py-8 sm:py-16",
        GUTTER,
        className,
      )}
    >
      {children}
    </div>
  )
}
