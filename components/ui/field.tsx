"use client"

import { CircleAlert } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  FieldContext,
  type FieldContextValue,
  type FieldWiring,
} from "@/components/ui/field-context"
import { Label } from "@/components/ui/label"
import {
  type Material,
  MaterialProvider,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { glassWords, schemeOf } from "@/components/ui/material-glass"
import { Panel } from "@/components/ui/panel"

// ONE CONTROL AND WHAT IS SAID ABOUT IT: its label, a line describing it, what is
// wrong with it, whether it is required, laid out the same way for every control
// and wired for a screen reader: the label names it (`htmlFor`), the description and
// the error describe it (`aria-describedby`), the error marks it (`aria-invalid`).
//
// THE CONTRACT a control meets to sit in a field is plain props: the field hands its
// children the wiring (`id`, `aria-describedby`, `aria-invalid`, `aria-required`,
// `disabled`), and a control spreads it on its focusable element:
//
//   <Field label="name" error={error}>
//     {(wiring) => <Input {...wiring} value={name} onChange={…} />}
//   </Field>
//
// A VALUE CONTROL READS `useField()` itself, so binding it is only its value: inside a
// field it spreads `wiring` on its own focusable element (id, the description and the
// error, invalid, required, disabled), holds still while `readOnly` (a form sending:
// it takes no change, keeps its focus, is never disabled), and may draw `invalid`.
// That is the whole contract a control (a number, a slider, a select, a switch) meets
// to sit in a field or a form, with no field-specific props of its own. Alone, a field
// is layout and accessibility; `ui/form` binds it to a form by name (value, change,
// leaving, the error said when it is due, read-only while it sends).
//
// The error comes and goes in place, its row opening from nothing and closing back,
// never a jump of everything under it. `material="glass"`: the label and lines catch
// the rim's light, and a fieldset is a pane of glass.

// What a control reads (the wiring, `useField()`, `heldStill`) is `field-context`, its
// own part, so a value control installs it without this file's layout.
export {
  type FieldContextValue,
  type FieldWiring,
  heldStill,
  useField,
} from "@/components/ui/field-context"

export type FieldOrientation = "vertical" | "horizontal"

export interface FieldProps
  extends Omit<React.ComponentProps<"div">, "children" | "id"> {
  label?: React.ReactNode
  /** One line saying what it is for, under the control. */
  description?: React.ReactNode
  /** What is wrong with it, said under the control (and to a screen reader). */
  error?: React.ReactNode
  required?: boolean
  disabled?: boolean
  /** The control holds still (a form sending); read by the control through
   *  `useField()`, never spread as an attribute. */
  readOnly?: boolean
  /** At the label's end: "optional", a count, a hint. */
  aside?: React.ReactNode
  /** Label above (default), or beside it on one row (a switch's, a checkbox's). */
  orientation?: FieldOrientation
  /** The control's id; made up when not given. */
  id?: string
  material?: Material
  /** The control, or a function given its wiring (and the label's id, for a group of
   *  controls named by `aria-labelledby`). */
  children:
    | React.ReactNode
    | ((wiring: FieldWiring, named: { labelId: string }) => React.ReactNode)
}

/** The quiet lines under a control, in either material. */
const LINE = "text-xs leading-5"
const DESCRIPTION: Record<Material, string> = {
  plain: "text-muted-foreground",
  glass: "text-current/65",
}
const ERROR: Record<Material, string> = {
  plain: "text-tone-bad",
  glass: `text-tone-bad ${glassWords}`,
}

export function Field({
  label,
  description,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  aside,
  orientation = "vertical",
  id: idProp,
  material,
  className,
  children,
  ...props
}: FieldProps) {
  const m = useMaterial(material)
  const made = React.useId()
  const id = idProp ?? `${made}-control`
  const labelId = `${made}-label`
  const descriptionId = `${made}-description`
  const errorId = `${made}-error`
  const invalid = error !== undefined && error !== null && error !== false
  const describedBy =
    [description ? descriptionId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined
  const wiring: FieldWiring = {
    id,
    ...(describedBy && { "aria-describedby": describedBy }),
    ...(invalid && { "aria-invalid": true as const }),
    ...(required && { "aria-required": true as const }),
    ...(disabled && { disabled: true }),
  }
  const context: FieldContextValue = {
    wiring,
    labelId,
    ...(typeof label === "string" && { label }),
    invalid,
    readOnly,
    material: m,
  }
  const control = (
    <FieldContext.Provider value={context}>
      {typeof children === "function"
        ? children(wiring, { labelId })
        : children}
    </FieldContext.Provider>
  )
  const name = label !== undefined && (
    <span
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-3",
        orientation === "horizontal" && "flex-1",
      )}
    >
      <Label id={labelId} htmlFor={id} material={m}>
        {label}
        {required && (
          // The words say it to a screen reader (aria-required on the control); the
          // mark is for the eye.
          <span aria-hidden className="-ml-1 text-tone-bad/80">
            *
          </span>
        )}
      </Label>
      {aside !== undefined && (
        <span className={cn(LINE, DESCRIPTION[m])}>{aside}</span>
      )}
    </span>
  )
  return (
    <div
      data-slot="field"
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-orientation={orientation}
      data-material={m}
      className={cn("grid min-w-0", disabled && "opacity-60", className)}
      {...props}
    >
      {/* Two rows, always: the name and the control, then what it says. A row of
          fields (`fieldRow`) lines its fields' rows up, so a field that speaks
          moves no other field's control. */}
      {orientation === "horizontal" ? (
        <div className="flex items-center gap-3">
          {name}
          {control}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {name}
          {control}
        </div>
      )}
      <div>
        {description && (
          <p
            id={descriptionId}
            data-slot="field-description"
            className={cn("mt-1.5", LINE, DESCRIPTION[m])}
          >
            {description}
          </p>
        )}
        <Said id={errorId} material={m}>
          {invalid ? error : null}
        </Said>
      </div>
    </div>
  )
}

/** Fields side by side on a grid (a sign-up in one line): every field's name and
 *  control on one row, what each says on the next (CSS subgrid), so one field's
 *  error opens under it without moving the controls beside it. On the grid with its
 *  columns; something after the fields that is no field (a submit) flows into the
 *  control row's next free column by itself (`self-end` to sit on the controls' line;
 *  a row-start of its own would place it before them). The grid's row gap is also
 *  the gap between a control and its words, so a row of fields sets none.
 *
 *  The words' row keeps one line from the start (the error's `mt-1.5` and its
 *  `leading-5`, 1.625rem), so the first error to open fills room already there and
 *  nothing around the row grows: aligned fields alone still let the first error push
 *  the whole card taller. Only words longer than a line add to it. */
export const fieldRow =
  "[grid-auto-rows:auto_minmax(1.625rem,auto)] [&>[data-slot=field]]:row-span-2 [&>[data-slot=field]]:grid-rows-subgrid"

/** The error's row: it opens from nothing when there is something to say and closes
 *  back, keeping the words while it closes, so nothing under it jumps. */
function Said({
  id,
  material,
  children,
}: {
  id: string
  material: Material
  children: React.ReactNode
}) {
  const open = children !== null
  // The last words, kept while the row closes.
  const last = React.useRef<React.ReactNode>(children)
  if (open) last.current = children
  const kept = last.current
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <p
          id={open ? id : undefined}
          data-slot="field-error"
          className={cn(
            "mt-1.5 flex items-start gap-1.5 font-medium",
            LINE,
            ERROR[material],
          )}
        >
          <CircleAlert aria-hidden className="mt-[3px] size-3.5 shrink-0" />
          {open ? children : kept}
        </p>
      </div>
    </div>
  )
}

export interface FieldSetProps
  extends Omit<React.ComponentProps<"fieldset">, "children"> {
  /** What the group is: the fieldset's legend. */
  legend?: React.ReactNode
  description?: React.ReactNode
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  children: React.ReactNode
}

/** Fields that belong together, under one name (a fieldset and its legend): a panel
 *  of the page's surface, or a pane of glass. */
export function FieldSet({
  legend,
  description,
  material,
  scheme,
  className,
  children,
  ref,
  ...props
}: FieldSetProps) {
  const m = useMaterial(material)
  const [s, here] = useSurfaceScheme<HTMLFieldSetElement>(scheme, ref)
  const legendId = `${React.useId()}-legend`
  // What is inside stands on the set: it wears the set's scheme, whatever decided
  // it (a picture under the set included).
  const body = (
    <MaterialProvider scheme={s}>
      {legend !== undefined && (
        // Floated: a legend otherwise sits on the fieldset's border and cuts it.
        <legend
          id={legendId}
          data-slot="field-legend"
          className="float-left mb-1 w-full font-medium text-sm"
        >
          {legend}
        </legend>
      )}
      {description && (
        <p
          data-slot="fieldset-description"
          className={cn("clear-both -mt-0.5 mb-1", LINE, DESCRIPTION[m])}
        >
          {description}
        </p>
      )}
      <div className="clear-both flex flex-col gap-5">{children}</div>
    </MaterialProvider>
  )
  const shape = "m-0 min-w-0 flex flex-col gap-3 p-5"
  return m === "glass" ? (
    // The one glass container (Panel: body, spill, edge) drawn as the fieldset. What
    // it holds is wrapped (it stands on glass), so the legend is not the set's own
    // child: the set is named by it.
    <Panel
      render={<fieldset />}
      ref={here}
      material="glass"
      scheme={s}
      radius="1rem"
      data-slot="fieldset"
      aria-labelledby={legend === undefined ? undefined : legendId}
      bodyClassName={shape}
      className={className}
      {...props}
    >
      {body}
    </Panel>
  ) : (
    <fieldset
      ref={here}
      data-slot="fieldset"
      data-material={m}
      className={cn(
        shape,
        schemeOf(s),
        "rounded-xl border-0 bg-foreground/[0.025] ring-1 ring-foreground/8 ring-inset",
        className,
      )}
      {...props}
    >
      {body}
    </fieldset>
  )
}
