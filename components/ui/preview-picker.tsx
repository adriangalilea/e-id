"use client"

import { type ComponentPropsWithRef, type ReactNode, useId } from "react"
import { Tip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import "./edge-fade"

export interface PreviewPickerProps<T extends string | number>
  extends Omit<ComponentPropsWithRef<"fieldset">, "onChange" | "children"> {
  label: string
  value: T
  options: readonly {
    value: T
    label: string
    icon?: ReactNode
    disabled?: boolean
    /** What this option means, shown on hover of the option itself (its label dotted
     *  underneath as the affordance) and read with it by a screen reader. */
    hint?: string
  }[]
  onChange: (value: T) => void
  className?: string
  size?: "default" | "compact"
  /** Keep each option's label accessible while showing only its icon. */
  iconsOnly?: boolean
}

/** A single-row selector; narrow containers scroll horizontally rather than wrap. */
export function PreviewPicker<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  size = "default",
  iconsOnly = false,
  name: providedName,
  ...props
}: PreviewPickerProps<T>) {
  const generatedName = useId()
  const name = providedName ?? generatedName
  return (
    <fieldset
      {...props}
      data-slot="preview-picker"
      aria-label={label}
      className={cn(
        "inline-flex min-w-0 max-w-full rounded-full bg-foreground/5 p-1",
        className,
      )}
    >
      {/* The pill stays whole; too many choices for it scroll sideways inside it,
          the hidden side fading (scrims' `ag-edge-fade`). */}
      <div
        data-slot="preview-picker-options"
        className="ag-edge-fade flex min-w-0 flex-nowrap gap-1 rounded-full"
      >
        {options.map((option) => {
          const choice = (
            <label
              data-slot="preview-picker-option"
              key={option.value}
              title={iconsOnly ? option.label : undefined}
              data-selected={value === option.value || undefined}
              data-disabled={option.disabled || undefined}
              className={cn(
                "has-focus-visible:focus-ring relative flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium text-muted-foreground text-sm transition-colors hover:text-foreground has-focus-visible:-outline-offset-(--focus-ring-offset) data-disabled:cursor-not-allowed data-selected:bg-foreground/10 data-selected:text-foreground data-disabled:opacity-40 motion-reduce:transition-none",
                size === "compact" ? "min-h-8 px-3 py-1" : "min-h-11 px-4 py-2",
                iconsOnly &&
                  (size === "compact" ? "size-8 p-0" : "size-11 p-0"),
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                aria-description={option.hint}
                className="sr-only"
              />
              {option.icon != null && (
                <span
                  data-slot="preview-picker-icon"
                  aria-hidden
                  className="grid size-5 place-items-center text-xl leading-none [&>svg]:size-4"
                >
                  {option.icon}
                </span>
              )}
              {/* An option that explains itself says so: its label dotted underneath,
              the affordance for "there is more here on hover". */}
              <span
                className={cn(
                  iconsOnly && "sr-only",
                  option.hint &&
                    "underline decoration-current/35 decoration-dotted underline-offset-4",
                )}
              >
                {option.label}
              </span>
            </label>
          )
          return option.hint ? (
            <Tip key={option.value} content={option.hint}>
              {choice}
            </Tip>
          ) : (
            choice
          )
        })}
      </div>
    </fieldset>
  )
}
