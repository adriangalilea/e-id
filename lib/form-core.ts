// THE FORM, framework-free: values, what is wrong with them and when to say so, what
// changed since they were loaded, and sending them. `ui/form` binds it to React and
// draws it; this file runs in bun (scripts/examples/form-core.ts) and in any UI.
//
// WHY ITS OWN, not react-hook-form or TanStack Form. The registry ships source a
// consumer owns, so a form is better as two small files than as two packages and a
// resolver. Validation is Standard Schema (zod, valibot and arktype all answer
// `~standard`), so there is nothing to adapt. The controls here are value controls
// (`value` + `onValueChange`: number, slider, people-picker, chip-input) with no DOM
// input to register, which react-hook-form's uncontrolled refs are built around. And
// the timing, async checks, server errors, autosave and optimistic rollback are one
// model here, the same one the table's optimistic and staged edits follow, rather than
// four options of a library's.
//
// WHEN AN ERROR IS SAID: reward early, punish late. Everything is validated on every
// change, silently; a field's error is shown once it has been left (`blur`) or a
// submit was tried, and from then on it follows every change, so it disappears the
// moment the value is fixed. A server's answer is shown at once, and cleared by the
// next change to its field.
//
// PATHS are dot strings (`tracks.0.title`), typed from the values (`Path<T>`). A field
// array keeps a stable key per row (`keysOf`), and its rows' touched marks, errors and
// check answers move with the rows when they are inserted, removed or moved; a reset
// gives the loaded rows back their own keys.
//
// WHAT IS SENT IS WHAT WAS CHECKED. A submit takes the values as they stand at the
// press and decides on exactly those: their rules, and every check answered for exactly
// those values (asked again where the answer is missing, stale or was cut short). A
// change typed while it settles or sends is the next change, never part of this send.
//
// A CHECK THAT CANNOT ANSWER (it threw, the network is down, an async schema rejected)
// is a state, `failed`, with its reason: never a verdict on the value, never a form left
// busy. The field says it could not be checked; a submit asks again, and `recheck`
// asks one field again.
//
// ONE CHANGE, ONE NOTICE: a mutation's state writes are batched, so a keystroke wakes
// each subscriber once, whatever the rules and checks it sets going.

/** Standard Schema v1 (standardschema.dev), copied as the spec asks: no dependency. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
    ) => StandardResult<Output> | Promise<StandardResult<Output>>
    readonly types?:
      | { readonly input: Input; readonly output: Output }
      | undefined
  }
}
export type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: readonly StandardIssue[] }
export interface StandardIssue {
  readonly message: string
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[]
}

// ── paths ─────────────────────────────────────────────────────────────────────────

type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Blob

/** Every path into `T`: `"name"`, `"tracks"`, `"tracks.0"`, `"tracks.0.title"`. */
export type Path<T> = T extends Leaf
  ? never
  : T extends readonly (infer E)[]
    ? `${number}` | `${number}.${Path<E>}`
    : {
        [K in keyof T & string]: NonNullable<T[K]> extends Leaf
          ? K
          : K | `${K}.${Path<NonNullable<T[K]>>}`
      }[keyof T & string]

/** The value at a path. */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? T extends readonly (infer E)[]
    ? K extends `${number}`
      ? PathValue<E, R>
      : never
    : K extends keyof T
      ? PathValue<NonNullable<T[K]>, R>
      : never
  : T extends readonly (infer E)[]
    ? P extends `${number}`
      ? E
      : never
    : P extends keyof T
      ? T[P]
      : never

/** The paths whose value is an array: what a field array binds. */
export type ArrayPath<T> = {
  [P in Path<T>]: PathValue<T, P> extends readonly unknown[] ? P : never
}[Path<T>]

/** An array path's row. */
export type RowOf<T, P extends ArrayPath<T>> =
  PathValue<T, P> extends readonly (infer E)[] ? E : never

const steps = (path: string): string[] => (path === "" ? [] : path.split("."))

/** The value at `path`, undefined where the way runs out. */
export function getAt(root: unknown, path: string): unknown {
  let at: unknown = root
  for (const s of steps(path)) {
    if (at === null || typeof at !== "object") return undefined
    at = (at as Record<string, unknown>)[s]
  }
  return at
}

/** `root` with `value` at `path`, copied along the way (arrays stay arrays). The way
 *  must exist: a path through nothing is a confused caller, and it screams. */
export function setAt<R>(root: R, path: string, value: unknown): R {
  const [head, ...rest] = steps(path)
  if (head === undefined) return value as R
  assert(
    root !== null && typeof root === "object",
    `form: no object to set ${path} in`,
  )
  const next = rest.length
    ? setAt((root as Record<string, unknown>)[head], rest.join("."), value)
    : value
  if (Array.isArray(root)) {
    const i = Number(head)
    assert(
      Number.isInteger(i) && i >= 0 && i <= root.length,
      `form: ${head} is no index of a ${root.length}-row array`,
    )
    const copy = root.slice()
    copy[i] = next
    return copy as R
  }
  return { ...(root as object), [head]: next } as R
}

/** Structural equality of form values: plain objects, arrays, dates, primitives. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka)
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    )
      return false
  return true
}

/** `path` is `prefix` or inside it. */
export const within = (path: string, prefix: string) =>
  prefix === "" || path === prefix || path.startsWith(`${prefix}.`)

/** A record keyed by path, its entries under `array` renumbered by `map` (an index to
 *  its new index, or null where the row is gone). */
export function reindex<V>(
  record: Readonly<Record<string, V>>,
  array: string,
  map: (index: number) => number | null,
): Record<string, V> {
  const out: Record<string, V> = {}
  const head = array === "" ? "" : `${array}.`
  for (const [path, v] of Object.entries(record)) {
    if (!path.startsWith(head)) {
      out[path] = v
      continue
    }
    const [index, ...rest] = path.slice(head.length).split(".")
    const to = map(Number(index))
    if (to === null) continue
    out[[`${head}${to}`, ...rest].join(".")] = v
  }
  return out
}

/** A Standard Schema issue's path as a dot path. */
export const issuePath = (issue: StandardIssue): string =>
  (issue.path ?? [])
    .map((s) => String(typeof s === "object" ? s.key : s))
    .join(".")

/** Issues as one message per path, the first said for each. */
export function errorsOf(
  issues: readonly StandardIssue[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const path = issuePath(issue)
    if (!(path in out)) out[path] = issue.message
  }
  return out
}

/** A check's path PATTERN: a path whose `*` steps stand for every row of an array
 *  (`tracks.*.title` is each track's title). `matches` says whether a concrete path is
 *  one of the pattern's. */
export function matches(pattern: string, path: string): boolean {
  const a = steps(pattern)
  const b = steps(path)
  return (
    a.length === b.length &&
    a.every((s, i) => (s === "*" ? /^\d+$/.test(b[i] as string) : s === b[i]))
  )
}

/** The concrete paths a pattern names in `values`: one per row where it has a `*`,
 *  each whose parent exists. */
export function expand(pattern: string, values: unknown): string[] {
  const walk = (rest: string[], at: unknown, done: string[]): string[] => {
    const [head, ...tail] = rest
    if (head === undefined) return [done.join(".")]
    if (at === null || typeof at !== "object") return []
    if (head === "*")
      return Array.isArray(at)
        ? at.flatMap((row, i) => walk(tail, row, [...done, String(i)]))
        : []
    return walk(tail, (at as Record<string, unknown>)[head], [...done, head])
  }
  return walk(steps(pattern), values, [])
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const reasonOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const without = <V>(record: Readonly<Record<string, V>>, path: string) => {
  if (!(path in record)) return record
  const { [path]: _gone, ...rest } = record
  return rest
}

// ── the form ──────────────────────────────────────────────────────────────────────

/** An async check of one field (is the name taken?): run after the field's own rules
 *  pass, `debounce` ms after its last change (default 300), cancelled by the next one.
 *  Answers the message to show, or nothing when it passes; a throw (or a rejection) is
 *  the check failing to answer, its reason kept in `failed`, never a verdict. */
export interface FieldCheck<T> {
  run: (
    value: unknown,
    context: { values: T; signal: AbortSignal },
  ) => string | undefined | Promise<string | undefined>
  debounce?: number
}

/** What a submission answers: nothing (saved), or what was refused: messages by path
 *  (or Standard Schema issues, a server's own validation), and a whole-form reason. */
// biome-ignore lint/suspicious/noConfusingVoidType: a handler that returns nothing (`async () => { … }`) is `Promise<void>`, which `undefined` refuses
export type SubmitAnswer = void | {
  errors?: Readonly<Record<string, string>> | readonly StandardIssue[]
  error?: string
}

export interface FormOptions<T> {
  /** The values as loaded: what "changed" is measured against. */
  initial: T
  /** The rules, any Standard Schema (zod, valibot, arktype) over the whole values;
   *  its refinements are the cross-field rules. */
  schema?: StandardSchemaV1<T, unknown>
  /** Rules beyond the schema, over the whole values: messages by path. */
  validate?: (values: T) => Readonly<Record<string, string>>
  /** Async checks by path, or by a path pattern for every row of an array
   *  (`tracks.*.title`: each track's title checked on its own). */
  checks?: Readonly<Record<string, FieldCheck<T>>>
  /** Sends the values. Thrown, the error's message is the form's reason. */
  onSubmit?: (values: T) => SubmitAnswer | Promise<SubmitAnswer>
  /** Treat the send as done the moment it starts (what changed is no longer changed),
   *  and roll back, with the reason, if it is refused. */
  optimistic?: boolean
  /** Send by itself this many ms after the last change, when valid. */
  autosave?: number
  /** The clock (tests). */
  now?: () => number
}

export interface FormState<T> {
  values: T
  initial: T
  /** The schema's and `validate`'s messages by path, said or not yet. */
  invalid: Readonly<Record<string, string>>
  /** The async checks' messages by path. */
  checked: Readonly<Record<string, string>>
  /** Paths an async check is running (or waiting its debounce) for. */
  checking: Readonly<Record<string, true>>
  /** What could not be checked, by path, and why: a check that threw or rejected
   *  (`""`: the form's own rules, an async schema that rejected). Not a verdict on the
   *  value: a submit asks again; `recheck` asks one again. */
  failed: Readonly<Record<string, string>>
  /** What the last submission was refused with, by path. */
  refused: Readonly<Record<string, string>>
  /** A reason for the whole form (the server's, a thrown error, a rollback). */
  formError: string | null
  touched: Readonly<Record<string, true>>
  submitCount: number
  submitting: boolean
  /** When the values were last saved, by this form. */
  savedAt: number | null
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; paths: string[] }
  /** A check could not answer (`failed`): nothing was sent. */
  | { ok: false; reason: "unchecked"; paths: string[] }
  | { ok: false; reason: "refused"; paths: string[] }
  | { ok: false; reason: "busy" }

/** How the form stands, in one word: what a status line says. */
export type FormStatus = "clean" | "unsaved" | "saving" | "saved" | "failed"

export interface Form<T> {
  /** It sends by itself (`autosave`): its fields never hold still while it sends. */
  readonly autosave: boolean
  get(): FormState<T>
  subscribe(listener: () => void): () => void
  setValue<P extends Path<T>>(path: P, value: PathValue<T, P>): void
  /** The field was left: its error may be said, its check runs now. */
  blur(path: string): void
  submit(): Promise<SubmitResult>
  /** Ask again what could not be checked: a field's check, or (`""`) the rules. */
  recheck(path: string): Promise<void>
  /** Back to the values as loaded, nothing touched or said; the loaded rows keep the
   *  keys they had. */
  reset(): void
  /** New loaded values (a save elsewhere, a refetch): what changed is measured from
   *  them; the values typed stay. */
  setInitial(values: T): void
  /** A refusal from elsewhere (a server action's answer). */
  refuse(answer: SubmitAnswer): void
  append<P extends ArrayPath<T>>(path: P, row: RowOf<T, P>): void
  insert<P extends ArrayPath<T>>(path: P, index: number, row: RowOf<T, P>): void
  remove(path: ArrayPath<T>, index: number): void
  move(path: ArrayPath<T>, from: number, to: number): void
  keysOf(path: ArrayPath<T>): readonly string[]
  dispose(): void
}

/** The value at a path, typed. */
export const valueAt = <T, P extends Path<T>>(state: FormState<T>, path: P) =>
  getAt(state.values, path) as PathValue<T, P>

/** Changed since loaded: a path, or the whole form. */
export const isDirty = <T>(state: FormState<T>, path = "") =>
  !deepEqual(getAt(state.values, path), getAt(state.initial, path))

/** Whether a field's error may be said yet. */
const said = <T>(state: FormState<T>, path: string) =>
  state.submitCount > 0 || path in state.touched

/** What a check that could not answer says, at its path. */
export const failureMessage = (path: string, reason: string) =>
  path === ""
    ? `the rules could not run: ${reason}`
    : `could not be checked: ${reason}`

/** The message to show at a path, if any: a refusal at once, its own rules (then its
 *  check, then a check that could not answer) once it has been left or a submit was
 *  tried. */
export function errorAt<T>(
  state: FormState<T>,
  path: string,
): string | undefined {
  if (path in state.refused) return state.refused[path]
  if (!said(state, path)) return undefined
  const failed = state.failed[path]
  return (
    state.invalid[path] ??
    state.checked[path] ??
    (failed === undefined ? undefined : failureMessage(path, failed))
  )
}

/** Every message to show, by path (the whole form's at `""`), each marked when it is
 *  a check that could not answer (it can be asked again), in no order: the page orders
 *  them as its fields stand. */
export function problemsOf<T>(
  state: FormState<T>,
): { path: string; message: string; failed: boolean }[] {
  const paths = new Set([
    ...Object.keys(state.invalid),
    ...Object.keys(state.checked),
    ...Object.keys(state.failed),
    ...Object.keys(state.refused),
  ])
  return [...paths].flatMap((path) => {
    const message = errorAt(state, path)
    return message === undefined
      ? []
      : [
          {
            path,
            message,
            failed:
              path in state.failed &&
              !(path in state.refused) &&
              !(path in state.invalid) &&
              !(path in state.checked),
          },
        ]
  })
}

export function statusOf<T>(state: FormState<T>): FormStatus {
  if (state.submitting) return "saving"
  if (
    state.formError !== null ||
    Object.keys(state.refused).length > 0 ||
    Object.keys(state.failed).length > 0
  )
    return "failed"
  if (isDirty(state)) return "unsaved"
  return state.savedAt === null ? "clean" : "saved"
}

const DEBOUNCE = 300

/** What one ask of a check came to: its message (none: it passes), why it could not
 *  answer, or that it was cut short by a newer change (no answer at all). */
type Outcome =
  | { message: string | undefined }
  | { failure: string }
  | { aborted: true }

export function createForm<T>(options: FormOptions<T>): Form<T> {
  const now = options.now ?? Date.now
  let state: FormState<T> = {
    values: options.initial,
    initial: options.initial,
    invalid: {},
    checked: {},
    checking: {},
    failed: {},
    refused: {},
    formError: null,
    touched: {},
    submitCount: 0,
    submitting: false,
    savedAt: null,
  }
  // Row keys of the field arrays, by path: identity, not state (nothing is shown
  // differently for a key), so handing out keys for rows seen the first time, which
  // happens while a UI draws them, changes nothing anyone is subscribed to. `loadedKeys`
  // are the keys of the loaded rows, what a reset gives back.
  const keys = new Map<string, readonly string[]>()
  const loadedKeys = new Map<string, readonly string[]>()
  const listeners = new Set<() => void>()

  // ── one change, one notice: writes inside `batch` notify once, at its end.
  let depth = 0
  let unsaid = false
  const notify = () => {
    for (const l of [...listeners]) l()
  }
  const set = (patch: Partial<FormState<T>>) => {
    state = { ...state, ...patch }
    if (depth > 0) unsaid = true
    else notify()
  }
  const batch = <R>(run: () => R): R => {
    depth++
    try {
      return run()
    } finally {
      depth--
      if (depth === 0 && unsaid) {
        unsaid = false
        notify()
      }
    }
  }

  // ── rules: the schema and `validate`. `rulesOf` answers for any values; `rule`
  // keeps the shown state for the values as they stand, an async schema's answer
  // applying only if no change came after it was asked.
  const rulesOf = (values: T): Promise<Record<string, string>> => {
    const extra = options.validate?.(values) ?? {}
    const merge = (fromSchema: Record<string, string>) => {
      const invalid = { ...fromSchema }
      for (const [p, m] of Object.entries(extra)) invalid[p] ??= m
      return invalid
    }
    const result = options.schema?.["~standard"].validate(values)
    if (result instanceof Promise)
      return result.then((r) => merge(r.issues ? errorsOf(r.issues) : {}))
    return Promise.resolve(merge(result?.issues ? errorsOf(result.issues) : {}))
  }
  let asked = 0
  const rule = () => {
    const ask = ++asked
    const values = state.values
    const extra = options.validate?.(values) ?? {}
    const apply = (fromSchema: Record<string, string>) => {
      if (ask !== asked) return
      const invalid = { ...fromSchema }
      for (const [p, m] of Object.entries(extra)) invalid[p] ??= m
      batch(() => {
        set({ invalid, failed: without(state.failed, "") })
        afterRules()
      })
    }
    const result = options.schema?.["~standard"].validate(values)
    if (result instanceof Promise)
      void result.then(
        (r) => apply(r.issues ? errorsOf(r.issues) : {}),
        (error: unknown) => {
          if (ask !== asked) return
          set({ failed: { ...state.failed, "": reasonOf(error) } })
        },
      )
    else apply(result?.issues ? errorsOf(result.issues) : {})
  }

  // ── async checks, per concrete path (a pattern's rows each their own): one running
  // at a time, the stale one aborted, its answer kept with the value it was for.
  const checks = options.checks ?? {}
  const patterns = Object.keys(checks)
  const checkAt = (path: string): FieldCheck<T> | undefined => {
    const pattern = patterns.find((p) => matches(p, path))
    return pattern === undefined ? undefined : checks[pattern]
  }
  const checkPaths = (values: T) => patterns.flatMap((p) => expand(p, values))
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const running = new Map<string, { value: unknown; done: Promise<Outcome> }>()
  const aborts = new Map<string, AbortController>()
  /** What each check last answered, and for which value: an unchanged field is not
   *  asked again, a row moved keeps its answer. A failure is never kept as an answer. */
  let answered = new Map<string, { value: unknown; outcome: Outcome }>()

  const cancelCheck = (path: string) => {
    clearTimeout(timers.get(path))
    timers.delete(path)
    aborts.get(path)?.abort()
    aborts.delete(path)
    running.delete(path)
  }
  /** One ask of a check, outside the shown state: for a snapshot's value. */
  const ask = (
    check: FieldCheck<T>,
    value: unknown,
    values: T,
    signal: AbortSignal,
  ): Promise<Outcome> =>
    new Promise<string | undefined>((resolve) =>
      resolve(check.run(value, { values, signal })),
    ).then(
      (message): Outcome => (signal.aborted ? { aborted: true } : { message }),
      (error: unknown): Outcome =>
        signal.aborted ? { aborted: true } : { failure: reasonOf(error) },
    )
  /** Ask a field's check now, for its value as it stands, into the shown state. */
  const runCheck = (path: string): Promise<Outcome> => {
    const check = checkAt(path)
    assert(check, `form: no check at ${path}`)
    cancelCheck(path)
    const value = getAt(state.values, path)
    if (path in state.invalid) {
      // Its own rules fail first: nothing to ask the check about.
      answered.delete(path)
      set({
        checked: without(state.checked, path),
        checking: without(state.checking, path),
        failed: without(state.failed, path),
      })
      return Promise.resolve({ message: undefined })
    }
    const abort = new AbortController()
    aborts.set(path, abort)
    set({
      checked: without(state.checked, path),
      failed: without(state.failed, path),
      checking: { ...state.checking, [path]: true },
    })
    const done = ask(check, value, state.values, abort.signal).then(
      (outcome) => {
        if ("aborted" in outcome) return outcome
        aborts.delete(path)
        running.delete(path)
        if ("failure" in outcome) answered.delete(path)
        else answered.set(path, { value, outcome })
        set({
          checking: without(state.checking, path),
          checked:
            "message" in outcome && outcome.message !== undefined
              ? { ...state.checked, [path]: outcome.message }
              : state.checked,
          failed:
            "failure" in outcome
              ? { ...state.failed, [path]: outcome.failure }
              : state.failed,
        })
        return outcome
      },
    )
    running.set(path, { value, done })
    return done
  }
  const scheduleCheck = (path: string) => {
    const check = checkAt(path)
    if (!check) return
    cancelCheck(path)
    const value = getAt(state.values, path)
    const known = answered.get(path)
    const checked = without(state.checked, path)
    const failed = without(state.failed, path)
    if (known && deepEqual(known.value, value) && "message" in known.outcome) {
      // Answered already for this very value (a row moved, a value put back): the
      // answer stands, nobody is asked again.
      const message = known.outcome.message
      set({
        checking: without(state.checking, path),
        failed,
        checked:
          message === undefined ? checked : { ...checked, [path]: message },
      })
      return
    }
    answered.delete(path)
    // Waiting out the debounce is checking too: the field's answer is not in, and a
    // stale one (about a value no longer there) is gone.
    set({ checked, failed, checking: { ...state.checking, [path]: true } })
    timers.set(
      path,
      setTimeout(() => void runCheck(path), check.debounce ?? DEBOUNCE),
    )
  }
  /** A check's answer for `path` at exactly `values`: the shown one when it is about
   *  the same value (running, answered, or asked now), else asked on its own. Never a
   *  stale or cut-short answer, never a failure taken as a pass. */
  const checkFor = async (path: string, values: T): Promise<Outcome> => {
    const check = checkAt(path)
    assert(check, `form: no check at ${path}`)
    const value = getAt(values, path)
    const live = running.get(path)
    if (live && deepEqual(live.value, value)) {
      const outcome = await live.done
      if (!("aborted" in outcome)) return outcome
    }
    const known = answered.get(path)
    if (known && deepEqual(known.value, value)) return known.outcome
    if (deepEqual(getAt(state.values, path), value)) {
      const outcome = await runCheck(path)
      if (!("aborted" in outcome)) return outcome
    }
    // The field moved on while this was asked: ask for these values on their own,
    // uncancellable (it is this send's, not the field's).
    return ask(check, value, values, new AbortController().signal)
  }
  /** Everything wrong with exactly `values`, and what could not be checked. */
  const verdictOf = async (
    values: T,
  ): Promise<{
    invalid: Record<string, string>
    failed: Record<string, string>
  }> => {
    let invalid: Record<string, string>
    try {
      invalid = await rulesOf(values)
    } catch (error) {
      return { invalid: {}, failed: { "": reasonOf(error) } }
    }
    const failed: Record<string, string> = {}
    await Promise.all(
      checkPaths(values).map(async (path) => {
        if (path in invalid) return
        const outcome = await checkFor(path, values)
        if ("failure" in outcome) failed[path] = outcome.failure
        else if ("message" in outcome && outcome.message !== undefined)
          invalid[path] = outcome.message
      }),
    )
    return { invalid, failed }
  }

  // ── autosave: after the rules settle on a change.
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let pendingSave = false
  const afterRules = () => {
    if (!pendingSave || options.autosave === undefined) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      pendingSave = false
      if (!isDirty(state)) return
      if (Object.keys(state.invalid).length > 0) return
      void form.submit()
    }, options.autosave)
  }

  /** A change made: what it invalidates goes, its rules and checks run again. */
  const changed = (path: string, patch: Partial<FormState<T>>) => {
    const refused = Object.fromEntries(
      Object.entries(state.refused).filter(
        ([p]) => !within(p, path) && !within(path, p),
      ),
    )
    pendingSave = true
    set({ ...patch, refused, formError: null })
    for (const p of checkPaths(state.values))
      if (within(p, path) || within(path, p)) scheduleCheck(p)
    rule()
  }

  let keyed = 0
  const arrayAt = (path: string): unknown[] => {
    const value = getAt(state.values, path)
    assert(Array.isArray(value), `form: ${path} is not an array`)
    return value
  }
  /** Rows moved: values, keys, touched marks, per-row messages and the checks' answers
   *  all follow. */
  const rearrange = (
    path: string,
    rows: unknown[],
    rowKeys: string[],
    map: (index: number) => number | null,
  ) => {
    for (const p of [...running.keys(), ...timers.keys()])
      if (within(p, path)) cancelCheck(p)
    keys.set(path, rowKeys)
    // Keys of arrays inside the rows follow their rows too.
    const inner = reindex(
      Object.fromEntries([...keys].filter(([p]) => p !== path)),
      path,
      map,
    )
    for (const p of [...keys.keys()]) if (p !== path) keys.delete(p)
    for (const [p, k] of Object.entries(inner)) keys.set(p, k)
    answered = new Map(
      Object.entries(reindex(Object.fromEntries(answered), path, map)),
    )
    changed(path, {
      values: setAt(state.values, path, rows),
      touched: reindex(state.touched, path, map),
      checked: reindex(state.checked, path, map),
      checking: reindex(state.checking, path, map),
      failed: reindex(state.failed, path, map),
    })
  }
  const snapshotKeys = () => new Map(keys)
  /** The loaded rows' keys become those of `values`' rows where the rows line up. */
  const loadKeys = (
    values: T,
    from: ReadonlyMap<string, readonly string[]>,
  ) => {
    loadedKeys.clear()
    for (const [p, k] of from) {
      const rows = getAt(values, p)
      if (Array.isArray(rows) && rows.length === k.length) loadedKeys.set(p, k)
    }
  }

  const form: Form<T> = {
    autosave: options.autosave !== undefined,
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setValue(path, value) {
      batch(() => changed(path, { values: setAt(state.values, path, value) }))
    },
    blur(path) {
      batch(() => {
        if (!(path in state.touched))
          set({ touched: { ...state.touched, [path]: true } })
        // Leaving a field asks its check now rather than after the debounce.
        if (checkAt(path) && timers.has(path)) void runCheck(path)
      })
    },
    async submit() {
      if (state.submitting) return { ok: false, reason: "busy" }
      clearTimeout(saveTimer)
      // What is sent is what is decided on: the values at the press, never a change
      // typed while they are checked or sent.
      const sent = state.values
      const sentKeys = snapshotKeys()
      // Busy from the press: settling the checks (is the name taken?) is part of
      // sending, and the button says so.
      set({ submitCount: state.submitCount + 1, submitting: true })
      const before = { initial: state.initial, keys: new Map(loadedKeys) }
      try {
        const { invalid, failed } = await verdictOf(sent)
        if (Object.keys(failed).length > 0) {
          batch(() => {
            set({ failed: { ...state.failed, ...failed }, submitting: false })
          })
          return { ok: false, reason: "unchecked", paths: Object.keys(failed) }
        }
        if (Object.keys(invalid).length > 0) {
          set({ submitting: false })
          return { ok: false, reason: "invalid", paths: Object.keys(invalid) }
        }
        batch(() => {
          set({
            formError: null,
            refused: {},
            ...(options.optimistic && { initial: sent }),
          })
          if (options.optimistic) loadKeys(sent, sentKeys)
        })
        let answer: SubmitAnswer
        try {
          answer = await options.onSubmit?.(sent)
        } catch (error) {
          answer = { error: reasonOf(error) }
        }
        const refused = answer?.errors
          ? Array.isArray(answer.errors)
            ? errorsOf(answer.errors as readonly StandardIssue[])
            : (answer.errors as Readonly<Record<string, string>>)
          : {}
        const formError = answer?.error ?? null
        if (formError !== null || Object.keys(refused).length > 0) {
          batch(() => {
            set({
              submitting: false,
              refused,
              formError,
              // Optimistic: what was taken as saved was not.
              ...(options.optimistic && { initial: before.initial }),
            })
            if (options.optimistic) loadKeys(before.initial, before.keys)
          })
          return { ok: false, reason: "refused", paths: Object.keys(refused) }
        }
        // Saved: what was sent is what is loaded now (a change typed while it was
        // sending stays a change).
        batch(() => {
          set({ submitting: false, initial: sent, savedAt: now() })
          loadKeys(sent, sentKeys)
        })
        if (options.autosave !== undefined && isDirty(state)) {
          pendingSave = true
          afterRules()
        }
        return { ok: true }
      } finally {
        // Whatever happened (a bug in a handler included), the form is never left
        // busy: the error, if any, goes on up.
        if (state.submitting) set({ submitting: false })
      }
    },
    async recheck(path) {
      if (path === "") {
        batch(() => {
          set({ failed: without(state.failed, "") })
          rule()
        })
        return
      }
      assert(checkAt(path), `form: no check at ${path} to ask again`)
      await runCheck(path)
    },
    reset() {
      batch(() => {
        for (const p of [...running.keys(), ...timers.keys()]) cancelCheck(p)
        answered.clear()
        clearTimeout(saveTimer)
        pendingSave = false
        set({
          values: state.initial,
          touched: {},
          checked: {},
          checking: {},
          failed: {},
          refused: {},
          formError: null,
          submitCount: 0,
        })
        // The loaded rows take back their own keys: nothing they hold remounts.
        keys.clear()
        for (const [p, k] of loadedKeys) keys.set(p, k)
        rule()
      })
    },
    setInitial(values) {
      batch(() => {
        set({ initial: values })
        loadKeys(values, keys)
      })
    },
    refuse(answer) {
      if (!answer) return
      set({
        refused: answer.errors
          ? Array.isArray(answer.errors)
            ? errorsOf(answer.errors as readonly StandardIssue[])
            : (answer.errors as Readonly<Record<string, string>>)
          : {},
        formError: answer.error ?? null,
      })
    },
    append(path, row) {
      form.insert(path, arrayAt(path).length, row)
    },
    insert(path, index, row) {
      const rows = arrayAt(path)
      assert(
        Number.isInteger(index) && index >= 0 && index <= rows.length,
        `form: no row ${index} to insert at in ${path} (${rows.length} rows)`,
      )
      const rowKeys = [...form.keysOf(path)]
      rowKeys.splice(index, 0, `k${keyed++}`)
      const next = rows.slice()
      next.splice(index, 0, row)
      batch(() =>
        rearrange(path, next, rowKeys, (i) => (i >= index ? i + 1 : i)),
      )
    },
    remove(path, index) {
      const rows = arrayAt(path)
      assert(
        index >= 0 && index < rows.length,
        `form: no row ${index} in ${path} (${rows.length} rows)`,
      )
      batch(() =>
        rearrange(
          path,
          rows.filter((_, i) => i !== index),
          form.keysOf(path).filter((_, i) => i !== index),
          (i) => (i === index ? null : i > index ? i - 1 : i),
        ),
      )
    },
    move(path, from, to) {
      const rows = arrayAt(path)
      assert(
        from >= 0 && from < rows.length && to >= 0 && to < rows.length,
        `form: cannot move row ${from} to ${to} in ${path} (${rows.length} rows)`,
      )
      if (from === to) return
      const order = rows.map((_, i) => i)
      order.splice(to, 0, ...order.splice(from, 1))
      const rowKeys = form.keysOf(path)
      // order[newIndex] = oldIndex; the map asks the reverse.
      const where = new Map(order.map((old, i) => [old, i]))
      batch(() =>
        rearrange(
          path,
          order.map((i) => rows[i]),
          order.map((i) => rowKeys[i] as string),
          (i) => where.get(i) ?? null,
        ),
      )
    },
    keysOf(path) {
      const length = arrayAt(path).length
      const known = keys.get(path)
      if (known && known.length === length) return known
      // Rows the form has no keys for yet (first asked, or the array replaced whole):
      // keys of their own; the loaded rows' keys when these are the loaded rows.
      const made = Array.from({ length }, () => `k${keyed++}`)
      keys.set(path, made)
      if (deepEqual(getAt(state.values, path), getAt(state.initial, path)))
        loadedKeys.set(path, made)
      return made
    },
    dispose() {
      for (const p of [...running.keys(), ...timers.keys()]) cancelCheck(p)
      clearTimeout(saveTimer)
      listeners.clear()
    },
  }
  rule()
  return form
}
