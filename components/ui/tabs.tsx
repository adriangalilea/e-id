"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      `inline-flex h-10 items-center justify-center bg-muted p-1
      text-muted-foreground`,
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Focus is drawn INSIDE the tab, a line in its own ink 4px in from its
      // edge: a ring outside it crossed into the tabs beside it and doubled the
      // chosen one's frame.
      `inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5
      text-sm font-medium transition-colors focus-visible:outline-1
      focus-visible:-outline-offset-4 focus-visible:outline-current
      disabled:pointer-events-none disabled:opacity-50
      data-[state=active]:bg-background data-[state=active]:text-foreground`,
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // The panel takes focus only to be scrolled by keys: its focus is a line
      // inside its own edge, never a ring over the page.
      `mt-2 focus-visible:outline-1 focus-visible:-outline-offset-4
      focus-visible:outline-foreground/40`,
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
