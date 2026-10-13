"use client"

import * as React from "react"
import type { Material } from "@/components/ui/material"

// WHAT A CONTROL READS FROM THE FIELD AROUND IT, and nothing else: the context `field`
// provides, its own item so a value control (a number, a slider, a select, a switch)
// can read it without installing the field's layout, its label and its error row.
//
// Inside a field a value control applies `wiring` to its own focusable element (id,
// the description and the error, invalid, required, disabled), holds still while
// `readOnly` (a form sending: it takes no change, keeps its focus, is never disabled),
// and names a group of itself by `labelId`. Binding it is then only its value. What a
// consumer passes explicitly wins over the field's.

/** What a control spreads on its focusable element. */
export interface FieldWiring {
  id: string
  "aria-describedby"?: string
  "aria-invalid"?: true
  "aria-required"?: true
  disabled?: boolean
}

/** What a control inside a field reads (`useField()`). */
export interface FieldContextValue {
  wiring: FieldWiring
  /** The label's own id, for a control named by `aria-labelledby`. */
  labelId: string
  /** The label as words, where it is words (a control that takes a name as text). */
  label?: string
  /** Something is wrong with it (the same fact as `wiring["aria-invalid"]`). */
  invalid: boolean
  /** Hold still: take no change, keep the focus (a form sending). Never disabled. */
  readOnly: boolean
  material: Material
}

export const FieldContext = React.createContext<FieldContextValue | null>(null)

/** The field around a control, or null outside one. */
export const useField = () => React.useContext(FieldContext)

/** The field's wiring as a value control's own props, spread BEFORE the consumer's so
 *  what it passes wins. `named`: the control is a role on an element a `<label for>`
 *  cannot name (Base UI's checkbox, switch, radio group are spans), so the field's
 *  label names it by id. `readOnly` for a control that takes it (it keeps its focus). */
export function fieldProps(
  field: FieldContextValue | null,
  { named = false }: { named?: boolean } = {},
): Partial<FieldWiring> & { "aria-labelledby"?: string; readOnly?: boolean } {
  if (!field) return {}
  return {
    ...field.wiring,
    ...(named ? { "aria-labelledby": field.labelId } : {}),
    ...(field.readOnly ? { readOnly: true } : {}),
  }
}

/** A value control's change, held still while its field is read-only: the change
 *  is dropped, never the control disabled (it keeps its focus). */
export function heldStill<A extends unknown[]>(
  field: FieldContextValue | null,
  change: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
  if (!change) return change
  return (...args: A) => {
    if (field?.readOnly) return
    change(...args)
  }
}
