import { cn } from "@/lib/utils";

/** The page's side margins, one value for the home's grid, every column and the
 *  footer, so their edges line up. */
export const GUTTER = "px-5 sm:px-8";

/** A page that reads as one column: profiles, the edit form, the faq. */
export function Column({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
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
  );
}
