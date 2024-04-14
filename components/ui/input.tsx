import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-10 border border-input bg-background px-3 py-2 text-sm
          ring-offset-background file:border-0 file:bg-transparent file:text-sm
          file:font-medium placeholder:text-muted-foreground focus-visible:border-zinc-500
          focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent
          focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50
          dark:bg-zinc-700/80 sm:dark:bg-zinc-800/60`,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
