"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SwitchPublic = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger className="flex items-center">
        <SwitchPrimitives.Root
          {...props}
          className={cn(
            `group relative inline-flex size-10 items-center justify-center border
            border-border transition-colors hover:bg-zinc-950/15 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            hover:dark:bg-zinc-50/15`,
            className,
          )}
          ref={ref}
        >
          <SwitchPrimitives.Thumb className="absolute opacity-0" />
          <Eye
            className="absolute size-6 group-data-[state=checked]:opacity-100
              group-data-[state=unchecked]:opacity-0"
            strokeWidth={1}
          />
          <EyeOff
            className="absolute size-6 group-data-[state=checked]:opacity-0
              group-data-[state=unchecked]:opacity-100"
            strokeWidth={1}
          />
        </SwitchPrimitives.Root>
      </TooltipTrigger>
      <TooltipContent>
        <p id="public-tootlip">public</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));
SwitchPublic.displayName = "SwitchWithIcons";

export { SwitchPublic };
