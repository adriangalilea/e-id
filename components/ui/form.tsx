"use client"

import { CircleAlert, RotateCcw } from "lucide-react"
import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, type FieldProps, type FieldWiring } from "@/components/ui/field"
import { Kbd } from "@/components/ui/kbd"
import {
  type Material,
  type Scheme,
  useMaterial,
  useSurfaceScheme,
} from "@/components/ui/material"
import { Glass, schemeOf } from "@/components/ui/material-glass"
import { Spinner } from "@/components/ui/spinner"
import {
  type ArrayPath,
  createForm,
  deepEqual,
  errorAt,
  type Form as FormCore,
  type FormOptions,
  type FormState,
  getAt,
  isDirty,
  type Path,
  type PathValue,
  problemsOf,
  type RowOf,
  statusOf,
} from "@/lib/form-core"
import { cn } from "@/lib/utils"

// THE FORM: lib/form-core's values, rules, timing and sending, bound to React and
// drawn. A form is made once per mount (`useForm`), its fields bound to it by name
// (`form.Field`, typed: the name autocompletes, the value is the type at that path),
// and the page around it says how it stands:
//
//   const form = useForm({ initial, schema, onSubmit })
//   <Form form={form}>
//     <form.Field name="email" label="email">
//       {(c) => <Input type="email" {...c.input} />}
//     </form.Field>
//     <FormSummary />
//     <FormSubmit>save</FormSubmit>
//     <FormLeaveGuard />
//   </Form>
//
// ONE CONTRACT FOR EVERY CONTROL. A field's render prop is handed `c`, its control:
// a text field (a string path, and only a string path: `c.input` does not exist on a
// number's) spreads `c.input` (id, name, value, onChange, onBlur, the aria wiring,
// readOnly while sending); any other control takes `c.value` and `c.onValueChange`
// and reads the rest from the field itself (`field-context`'s `useField()`: its wiring,
// named by the field's label, read-only while the form sends, invalid). The registry's
// value controls (number, slider, select, switch, checkbox, radio group, toggle group)
// all do; a control of your own reads it the same way, or spreads `c.wiring` on its
// focusable element and names a group by `aria-labelledby={c.labelId}`. Leaving a
// field is heard on the field itself (focus going out of it), so a control with no
// blur of its own still marks itself left.
//
// WHAT THE FORM DOES FOR A PERSON: errors said when they are due (lib/form-core);
// a failed submit focuses the first field with something to fix, and a summary lists
// every problem politely (heard after the focused field's own error), each a way to
// its field, a check that could not answer with a way to ask again; ⌘↵ (Ctrl↵)
// submits from anywhere in it, Enter from a single-line field; while it sends the
// button turns (and keeps its focus) and the fields hold still without losing theirs
// (read-only, never disabled, which would drop the focus); leaving with changes not
// saved asks first: the browser's own prompt for a reload or a closed tab (`guard`),
// a dialog for a link in the page (`FormLeaveGuard`); `autosave` sends by itself and
// a status line says saved, unsaved, saving, or why it failed, with a retry.
//
// MATERIALS: the field chrome is `field`'s (plain or glass); the summary is a panel
// of the page's red or a pane of glass stained red; `<MaterialProvider
// material="glass">` round a form puts all of it in glass.

/** A form made for this mount, with its fields bound by name. */
export interface FormHandle<T> extends FormCore<T> {
  /** A field bound by name: label, description, the error when it is due. */
  Field: <P extends Path<T>>(props: BoundFieldProps<T, P>) => React.ReactNode
  /** Rows bound by name: a list that grows, shrinks and reorders, each row keyed. */
  FieldArray: <P extends ArrayPath<T>>(
    props: BoundFieldArrayProps<T, P>,
  ) => React.ReactNode
}

/** A text field's props: wiring, name, value, onChange, onBlur, readOnly. */
export interface TextInput extends FieldWiring {
  name: string
  value: string
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
  onBlur: () => void
  readOnly: boolean
}

interface ControlBase<V> {
  name: string
  value: V
  onValueChange: (value: V) => void
  /** Leaving it; a control that never focuses can call it when it is done. */
  onBlur: () => void
  /** What to spread on its focusable element: id and the aria wiring. */
  wiring: FieldWiring
  /** The label's id: a group of controls (radios, a segmented choice) is named by
   *  `aria-labelledby={labelId}`. */
  labelId: string
  /** The field's label as words, for a control that takes its name as text. */
  label: string
  invalid: boolean
  /** An async check is running for it. */
  checking: boolean
  /** Sending: hold still (read-only), keep the focus. */
  readOnly: boolean
}

/** A field's control: everything a control needs to be this field. `input`, a text
 *  field's props, exists only where the value is text: spreading it on a number's
 *  field does not compile. */
export type FieldControl<V> = ControlBase<V> &
  ([V] extends [string | null | undefined] ? { input: TextInput } : unknown)

export interface BoundFieldProps<T, P extends Path<T>>
  extends Omit<FieldProps, "children" | "error" | "readOnly"> {
  name: P
  children: (control: FieldControl<PathValue<T, P>>) => React.ReactNode
}

export interface FieldRow<P extends string> {
  /** Stable for the row while it lives, wherever it moves (and given back to a loaded
   *  row on a reset): the React key. */
  key: string
  index: number
  /** The row's path, to name its fields: `${path}.title`. */
  path: `${P}.${number}`
}

export interface FieldArrayOps<R> {
  append: (row: R) => void
  insert: (index: number, row: R) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
}

export interface BoundFieldArrayProps<T, P extends ArrayPath<T>> {
  name: P
  children: (
    rows: FieldRow<P>[],
    ops: FieldArrayOps<RowOf<T, P>>,
  ) => React.ReactNode
}

// ── reading the form ─────────────────────────────────────────────────────────────

/** Shallow equality: a selector returning a small object or tuple re-renders only
 *  when one of its members changed. */
function shallow(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return false
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) =>
    Object.is(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    ),
  )
}

/** A slice of the form's state; re-renders only when the slice changes, by `equal`
 *  (shallow by default; `deepEqual` for a slice that builds lists). */
export function useFormState<T, S>(
  form: FormCore<T>,
  select: (state: FormState<T>) => S,
  equal: (a: S, b: S) => boolean = shallow,
): S {
  const cache = React.useRef<{ state: FormState<T>; value: S } | null>(null)
  const read = () => {
    const state = form.get()
    const was = cache.current
    if (was && was.state === state) return was.value
    const value = select(state)
    if (was && equal(was.value, value)) {
      cache.current = { state, value: was.value }
      return was.value
    }
    cache.current = { state, value }
    return value
  }
  return React.useSyncExternalStore(form.subscribe, read, read)
}

// ── where the fields stand ───────────────────────────────────────────────────────

interface Placed {
  path: string
  label: string
  element: HTMLElement
}

/** The bound fields in the order they stand on the page, and what each is called:
 *  what the summary lists them in and by. Kept as fields mount, move and go, in their
 *  effects, so reading it never reads the page during a render. */
function placesOf() {
  let placed: Placed[] = []
  return {
    place(path: string, label: string, element: HTMLElement) {
      placed = placed.filter((p) => p.path !== path && p.element !== element)
      const entry = { path, label, element }
      // Before the first field that comes after it in the document.
      const at = placed.findIndex(
        (p) =>
          element.compareDocumentPosition(p.element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      )
      if (at < 0) placed.push(entry)
      else placed.splice(at, 0, entry)
      return () => {
        placed = placed.filter((p) => p !== entry)
      }
    },
    /** Where a path stands (the form's own `""` first, a path with no field last). */
    rank(path: string) {
      if (path === "") return -1
      const at = placed.findIndex((p) => p.path === path)
      return at < 0 ? placed.length : at
    },
    get: (path: string) => placed.find((p) => p.path === path),
  }
}
type Places = ReturnType<typeof placesOf>

// ── the form ─────────────────────────────────────────────────────────────────────

interface FormContextValue {
  // biome-ignore lint/suspicious/noExplicitAny: one context for forms of every shape
  form: FormCore<any>
  element: React.RefObject<HTMLFormElement | null>
  places: Places
}

const FormContext = React.createContext<FormContextValue | null>(null)

function useFormContext(part: string): FormContextValue {
  const context = React.useContext(FormContext)
  if (!context) throw new Error(`${part} outside a <Form>`)
  return context
}

/** Makes the form for this mount. Its callbacks are read live (a handler closing
 *  over this render's props is the one called); its schema, its checks' paths and its
 *  initial values are the first render's (new loaded values: `form.setInitial`). */
export function useForm<T>(options: FormOptions<T>): FormHandle<T> {
  const live = React.useRef(options)
  live.current = options
  const [handle] = React.useState(() => {
    const core = createForm<T>({
      ...options,
      validate: options.validate && ((v) => live.current.validate?.(v) ?? {}),
      checks:
        options.checks &&
        Object.fromEntries(
          Object.entries(options.checks).map(([path, check]) => [
            path,
            {
              debounce: check.debounce,
              run: (value, context) => {
                const now = live.current.checks?.[path]
                if (!now) throw new Error(`form: the check at ${path} is gone`)
                return now.run(value, context)
              },
            },
          ]),
        ),
      onSubmit: (values) => live.current.onSubmit?.(values),
    })
    const bound = core as FormHandle<T>
    bound.Field = (props) => <BoundField form={core} {...props} />
    bound.FieldArray = (props) => <BoundFieldArray form={core} {...props} />
    return bound
  })
  // Timers and in-flight checks end with the mount; the form itself stays usable (a
  // remount in development subscribes again).
  React.useEffect(() => () => handle.dispose(), [handle])
  return handle
}

export interface FormProps<T>
  extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  form: FormCore<T>
  /** The browser's own prompt before a reload or a closed tab with changes not saved.
   *  Default on. A link in the page asks through `FormLeaveGuard`. */
  guard?: boolean
  /** Heard after every submit, with what came of it. */
  onSubmitted?: (result: Awaited<ReturnType<FormCore<T>["submit"]>>) => void
}

/** The fields' focusable things, for the first invalid one to be focused. */
const FOCUSABLE =
  "input:not([type=hidden]),textarea,select,button,[tabindex]:not([tabindex='-1'])"

export function Form<T>({
  form,
  guard = true,
  onSubmitted,
  className,
  children,
  onKeyDown,
  ...props
}: FormProps<T>) {
  const element = React.useRef<HTMLFormElement>(null)
  const [places] = React.useState(placesOf)
  const dirty = useFormState(form, (s) => isDirty(s) || s.submitting)
  const submitting = useFormState(form, (s) => s.submitting)

  const send = async () => {
    const result = await form.submit()
    onSubmitted?.(result)
    if (result.ok || result.reason === "busy") return
    // After the fields have drawn what they say: the first one to fix, in the
    // order they stand, takes the focus, a `Field` or a headless control alike (a
    // form-level refusal alone leaves it where it is; the summary says it).
    requestAnimationFrame(() => {
      const first = result.paths
        .filter((path) => path !== "")
        .sort((a, b) => places.rank(a) - places.rank(b))
        .map((path) => places.get(path)?.element)
        .find(Boolean)
      if (first) focusableIn(first)?.focus()
    })
  }

  // A reload or a closed tab with changes not saved: the browser's own prompt.
  React.useEffect(() => {
    if (!guard || !dirty) return
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", unload)
    return () => window.removeEventListener("beforeunload", unload)
  }, [guard, dirty])

  return (
    <FormContext.Provider value={{ form, element, places }}>
      <form
        ref={element}
        data-slot="form"
        noValidate
        aria-busy={submitting || undefined}
        className={cn("flex flex-col gap-5", className)}
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented) return
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            element.current?.requestSubmit()
          }
        }}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

// ── leaving with changes not saved ───────────────────────────────────────────────

/** A link pressed in the page while the form holds changes not saved: held, and
 *  `asking` until the person says `stay` or `leave` (which follows the link it held,
 *  as it would have gone). For a dialog of your own; `FormLeaveGuard` is one. A link
 *  to elsewhere in a new tab, with a modifier, or to a fragment of this page passes. */
export function useLeaveGuard(): {
  asking: boolean
  stay: () => void
  leave: () => void
} {
  const { form } = useFormContext("useLeaveGuard")
  const dirty = useFormState(form, (s) => isDirty(s) || s.submitting)
  const [held, setHeld] = React.useState<HTMLAnchorElement | null>(null)
  // The press a `leave` makes again, let through once.
  const through = React.useRef<HTMLAnchorElement | null>(null)
  React.useEffect(() => {
    if (!dirty) return
    const link = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]")
      if (!(a instanceof HTMLAnchorElement)) return
      if (through.current === a) {
        through.current = null
        return
      }
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (a.target === "_blank" || a.hasAttribute("download")) return
      if (a.origin !== window.location.origin) return
      if (a.pathname === window.location.pathname && a.hash) return
      e.preventDefault()
      e.stopPropagation()
      setHeld(a)
    }
    document.addEventListener("click", link, true)
    return () => document.removeEventListener("click", link, true)
  }, [dirty])
  return {
    asking: held !== null,
    stay: () => setHeld(null),
    leave: () => {
      const a = held
      setHeld(null)
      if (!a) return
      through.current = a
      a.click()
    },
  }
}

/** Asks before a link in the page leaves changes not saved: a dialog with stay and
 *  leave, in the form's material. Inside a `<Form>`. */
export function FormLeaveGuard({
  title = "leave without saving?",
  description = "your changes here are not saved yet",
  material,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  material?: Material
}) {
  const { asking, stay, leave } = useLeaveGuard()
  const m = useMaterial(material)
  return (
    <Dialog open={asking} onOpenChange={(open) => !open && stay()}>
      <DialogContent material={m}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={stay}>
            stay
          </Button>
          <Button variant="destructive" onClick={leave}>
            leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── a field ──────────────────────────────────────────────────────────────────────

/** A path of the form bound without a `Field` round it: for a control that must
 *  look like something other than a field (a name written on a card, a cell in a
 *  table), whose label and error the page places itself. */
export interface HeadlessControl<V> {
  name: string
  value: V
  onValueChange: (value: V) => void
  /** Leaving it: its error may be said, its check runs. */
  onBlur: () => void
  /** What to show at it, when it is due (lib/form-core, `errorAt`). */
  error: string | undefined
  invalid: boolean
  /** An async check is running for it. */
  checking: boolean
  /** Sending: hold still (read-only), keep the focus. */
  readOnly: boolean
  /** A ref callback for the control's element (or one round it): where the
   *  summary lists it and what a failed submit focuses. Not named `ref`: React's
   *  compiler reads an object with a `ref` as a ref and refuses its other reads
   *  during render. */
  anchor: (element: HTMLElement | null) => void
}

/** A headless control's text props, only where the value is text. */
export interface HeadlessTextInput {
  name: string
  value: string
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
  onBlur: () => void
  readOnly: boolean
  "aria-invalid"?: true
}

export type HeadlessFieldControl<V> = HeadlessControl<V> &
  ([V] extends [string | null | undefined]
    ? { input: HeadlessTextInput }
    : unknown)

/** Binds one path of `form`: its value, its change, leaving it, what is wrong with
 *  it, all from the form's state and re-rendering only when those change. What
 *  `form.Field` is made of, for a control that draws its own label and error. Inside
 *  a `<Form>`, `anchor` places it for the summary (by `label`, else the path). */
export function useFormField<T, P extends Path<T>>(
  form: FormCore<T>,
  name: P,
  label?: string,
): HeadlessFieldControl<PathValue<T, P>> {
  const context = React.useContext(FormContext)
  const [value, error, checking, submitting] = useFormState(
    form,
    (s) =>
      [
        getAt(s.values, name) as PathValue<T, P>,
        errorAt(s, name),
        name in s.checking,
        s.submitting,
      ] as const,
  )
  const words = label ?? name
  const places = context?.places
  // The summary lists it where it stands, by its words; gone with the element.
  const anchor = React.useCallback(
    (element: HTMLElement | null) => {
      if (!places || !element) return
      return places.place(name, words, element)
    },
    [places, name, words],
  )
  const readOnly = submitting && !form.autosave
  const onValueChange = (v: PathValue<T, P>) => form.setValue(name, v)
  const onBlur = () => form.blur(name)
  const invalid = error !== undefined
  const input: HeadlessTextInput = {
    name,
    value: (value ?? "") as string,
    onChange: (e) => onValueChange(e.currentTarget.value as PathValue<T, P>),
    onBlur,
    readOnly,
    ...(invalid && { "aria-invalid": true as const }),
  }
  // `input` is offered at run time to every path and typed only where the value
  // is text (HeadlessFieldControl), which keeps it off a number's.
  return {
    name,
    value,
    onValueChange,
    onBlur,
    error,
    invalid,
    checking,
    readOnly,
    anchor,
    input,
  } as HeadlessControl<PathValue<T, P>> as HeadlessFieldControl<PathValue<T, P>>
}

/** The focusable thing at or inside a placed element. */
function focusableIn(element: HTMLElement): HTMLElement | null {
  return element.matches(FOCUSABLE)
    ? element
    : element.querySelector<HTMLElement>(FOCUSABLE)
}

function BoundField<T, P extends Path<T>>({
  form,
  name,
  label,
  aside,
  children,
  onBlur,
  ...field
}: BoundFieldProps<T, P> & { form: FormCore<T> }) {
  const words = typeof label === "string" ? label : name
  const {
    value,
    error,
    checking,
    readOnly,
    onValueChange,
    onBlur: leave,
    anchor,
  } = useFormField(form, name, words)
  return (
    <Field
      ref={anchor}
      label={label}
      error={error}
      readOnly={readOnly}
      aside={
        checking ? (
          <span className="inline-flex items-center gap-1.5">
            <Spinner size="sm" label="checking" />
            checking
          </span>
        ) : (
          aside
        )
      }
      data-field-path={name}
      // Focus leaving the field (not moving inside it): the field was left.
      onBlur={(e) => {
        onBlur?.(e)
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leave()
      }}
      {...field}
    >
      {(wiring, { labelId }) => {
        const input: TextInput = {
          ...wiring,
          name,
          value: (value ?? "") as string,
          onChange: (e) =>
            onValueChange(e.currentTarget.value as PathValue<T, P>),
          onBlur: leave,
          readOnly,
        }
        // `input` is offered at run time to every field and typed only where the
        // value is text (FieldControl), which is what keeps it off a number's.
        return children({
          name,
          value,
          onValueChange,
          onBlur: leave,
          wiring,
          labelId,
          input,
          label: words,
          invalid: error !== undefined,
          checking,
          readOnly,
        } as ControlBase<PathValue<T, P>> as FieldControl<PathValue<T, P>>)
      }}
    </Field>
  )
}

function BoundFieldArray<T, P extends ArrayPath<T>>({
  form,
  name,
  children,
}: BoundFieldArrayProps<T, P> & { form: FormCore<T> }) {
  // The rows' values decide how many there are; the keys follow them.
  useFormState(form, (s) => getAt(s.values, name))
  const keys = form.keysOf(name)
  const rows = keys.map((key, index) => ({
    key,
    index,
    path: `${name}.${index}` as `${P}.${number}`,
  }))
  return children(rows, {
    append: (row) => form.append(name, row),
    insert: (index, row) => form.insert(name, index, row),
    remove: (index) => form.remove(name, index),
    move: (from, to) => form.move(name, from, to),
  })
}

// ── what the form says ───────────────────────────────────────────────────────────

/** What is wrong, after a submit that could not go: every problem, in the order the
 *  fields stand, each a way to its field; the form's own reason first; a check that
 *  could not answer with a way to ask it again. Polite: a failed submit moves the
 *  focus to the first field to fix, whose own error is heard first, then this. It is
 *  always in the page (hidden while it has nothing to say), so what appears in it is
 *  heard. */
export function FormSummary({
  material,
  scheme,
  className,
}: {
  material?: Material
  /** The colour scheme it stands in (material): default the nearest provider's. */
  scheme?: Scheme
  className?: string
}) {
  const { form, places } = useFormContext("FormSummary")
  const m = useMaterial(material)
  // Over a picture the summary's surface is read by the part of it under it.
  const [s, here] = useSurfaceScheme<HTMLDivElement>(scheme)
  const { tried, formError, list } = useFormState(
    form,
    (s) => ({
      tried: s.submitCount > 0 || Object.keys(s.refused).length > 0,
      formError: s.formError,
      list: problemsOf(s),
    }),
    deepEqual,
  )
  const sorted = [...list].sort(
    (a, b) => places.rank(a.path) - places.rank(b.path),
  )
  const shown = tried && (formError !== null || sorted.length > 0)
  const go = (path: string) => {
    const element = places.get(path)?.element
    if (element) focusableIn(element)?.focus()
  }
  const count = sorted.filter((p) => p.path !== "").length
  const body = shown && (
    <div className="flex items-start gap-2.5">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-medium text-[13px]">
          {formError ??
            (count === 1 ? "one thing to fix" : `${count} things to fix`)}
        </p>
        {sorted.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {sorted.map((p) => (
              <li key={p.path} className="flex flex-wrap items-baseline gap-2">
                {p.path === "" ? (
                  p.message
                ) : (
                  <button
                    type="button"
                    onClick={() => go(p.path)}
                    className="cursor-pointer text-left underline-offset-2 hover:underline"
                  >
                    <span className="font-medium">
                      {places.get(p.path)?.label ?? p.path}
                    </span>
                    : {p.message}
                  </button>
                )}
                {p.failed && (
                  <button
                    type="button"
                    onClick={() => void form.recheck(p.path)}
                    className="inline-flex cursor-pointer items-center gap-1 underline-offset-2 hover:underline"
                  >
                    <RotateCcw aria-hidden className="size-3" />
                    ask again
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
  return (
    <div
      data-slot="form-summary"
      aria-live="polite"
      aria-atomic
      className={cn(!shown && "sr-only", className)}
    >
      {shown &&
        (m === "glass" ? (
          <Glass
            ref={here}
            shape="surface"
            scheme={s}
            tint="var(--tone-bad)"
            tintAmount={0.22}
            data-material={m}
            className="p-3.5 text-tone-bad [--glass-radius:--theme(--radius-2xl)]"
          >
            {body}
          </Glass>
        ) : (
          <div
            ref={here}
            data-material={m}
            className={cn(
              schemeOf(s),
              "rounded-lg bg-tone-bad/8 p-3.5 text-tone-bad ring-1 ring-tone-bad/25 ring-inset",
            )}
          >
            {body}
          </div>
        ))}
    </div>
  )
}

/** How the form stands, in a line (metadata's voice): unsaved, saving, saved at a
 *  time, or why it failed with a retry (which asks again whatever could not be
 *  checked). For a form that sends by itself, the whole of what it says. */
export function FormStatus({
  material,
  className,
}: {
  material?: Material
  className?: string
}) {
  const { form } = useFormContext("FormStatus")
  const m = useMaterial(material)
  const [status, savedAt, formError, invalid, unchecked] = useFormState(
    form,
    (s) =>
      [
        statusOf(s),
        s.savedAt,
        s.formError,
        Object.keys(s.invalid).length > 0,
        Object.keys(s.failed).length > 0,
      ] as const,
  )
  const time =
    savedAt === null
      ? null
      : new Date(savedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
  const why = formError ?? (unchecked ? "could not be checked" : null)
  return (
    <p
      data-slot="form-status"
      data-status={status}
      data-material={m}
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 font-mono text-xs lowercase",
        status === "failed"
          ? "text-tone-bad"
          : m === "glass"
            ? "text-current/60"
            : "text-muted-foreground",
        className,
      )}
    >
      {status === "saving" && <Spinner size="sm" label="saving" material={m} />}
      {status === "clean" && "nothing changed"}
      {status === "unsaved" &&
        (invalid ? "not saved: something to fix" : "unsaved changes")}
      {status === "saving" && "saving"}
      {status === "saved" && `saved${time ? ` at ${time}` : ""}`}
      {status === "failed" && (
        <>
          {`not saved${why ? `: ${why}` : ""}`}
          <button
            type="button"
            onClick={() => void form.submit()}
            className="ml-1 inline-flex cursor-pointer items-center gap-1 underline-offset-2 hover:underline"
          >
            <RotateCcw aria-hidden className="size-3" />
            retry
          </button>
        </>
      )}
    </p>
  )
}

/** The submit button: it turns while the form sends (keeping its focus), and shows
 *  the keys that send from anywhere in the form. */
export function FormSubmit({
  keys = true,
  children = "save",
  ...props
}: Omit<ButtonProps, "type" | "loading"> & {
  /** Show ⌘↵ beside the words. */
  keys?: boolean
}) {
  const { form } = useFormContext("FormSubmit")
  const submitting = useFormState(form, (s) => s.submitting)
  return (
    <Button type="submit" loading={submitting} {...props}>
      {children}
      {keys && <Kbd keys="mod+enter" className="ml-1 text-[11px] opacity-70" />}
    </Button>
  )
}

/** Back to the values as loaded; there only while something changed. The loaded rows
 *  keep their keys, so nothing they hold remounts and the focus stays. */
export function FormReset({
  children = "discard",
  variant = "ghost",
  ...props
}: Omit<ButtonProps, "type" | "onClick">) {
  const { form } = useFormContext("FormReset")
  const dirty = useFormState(form, (s) => isDirty(s))
  return (
    <Button
      type="button"
      variant={variant}
      disabled={!dirty}
      onClick={() => form.reset()}
      {...props}
    >
      {children}
    </Button>
  )
}
