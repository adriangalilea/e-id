// A VCARD READ (RFC 6350, and the 3.0 every phone still writes): its text to the
// fields a person reads, for `contact` to draw. Lines unfolded (a line that goes on
// starts with a space), escapes undone, a property's group read (Apple's `item1.URL`
// labelled by `item1.X-ABLabel`), the structured name and address split, an inline
// photo made a data URL. No framework, no DOM. A text that is no vCard screams.

export interface VCardField {
  value: string
  /** What the field is called here: its group's label, else its TYPE (home,
   *  work), else none. */
  label: string | null
}

export interface VCard {
  /** The formatted name, FN, as it is shown. */
  name: string
  nickname: string | null
  /** An image of them: a URL, or a data URL for an inline photo. */
  photo: string | null
  org: string | null
  title: string | null
  emails: VCardField[]
  phones: VCardField[]
  urls: VCardField[]
  /** Each address as one line, its parts joined. */
  addresses: VCardField[]
  note: string | null
  uid: string | null
}

interface Property {
  group: string | null
  name: string
  params: Record<string, string[]>
  value: string
}

/** The lines a vCard is folded into, put back together. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "")
}

/** A value's escapes undone (`\n`, `\,`, `\;`, `\\`). */
function unescaped(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, c: string) =>
    c === "n" || c === "N" ? "\n" : c,
  )
}

/** A structured value's parts, split at the `;` no backslash escapes. */
function parts(value: string): string[] {
  return value.split(/(?<!\\);/).map(unescaped)
}

function property(line: string): Property {
  // The value starts after the first `:` outside a quoted parameter.
  let quoted = false
  let at = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted
    else if (line[i] === ":" && !quoted) {
      at = i
      break
    }
  }
  if (at < 0)
    throw new Error(`vcard: a line with no value: ${line.slice(0, 60)}`)
  const [head = "", ...rawParams] = line.slice(0, at).split(";")
  const dot = head.indexOf(".")
  const params: Record<string, string[]> = {}
  for (const raw of rawParams) {
    // A bare parameter (3.0's `;HOME`) is a TYPE.
    const eq = raw.indexOf("=")
    const [key, val] =
      eq < 0 ? ["TYPE", raw] : [raw.slice(0, eq), raw.slice(eq + 1)]
    const name = (key ?? "").toUpperCase()
    params[name] = [
      ...(params[name] ?? []),
      ...(val ?? "").split(",").map((v) => v.replace(/^"|"$/g, "")),
    ]
  }
  return {
    group: dot < 0 ? null : head.slice(0, dot),
    name: (dot < 0 ? head : head.slice(dot + 1)).toUpperCase(),
    params,
    value: line.slice(at + 1),
  }
}

/** The types a field is not called by: how it travels, never what it is. */
const NOT_A_LABEL = new Set(["internet", "pref", "x400", "voice"])

export function parseVcard(text: string): VCard {
  const lines = unfold(text)
  if (lines[0]?.toUpperCase() !== "BEGIN:VCARD")
    throw new Error("vcard: it does not start with BEGIN:VCARD")
  const props = lines.slice(1).map(property)
  const labels = new Map(
    props
      .filter((p) => p.name === "X-ABLABEL" && p.group)
      .map((p) => [p.group as string, unescaped(p.value)]),
  )
  const labelOf = (p: Property) => {
    if (p.group && labels.has(p.group)) return labels.get(p.group) ?? null
    const type = (p.params.TYPE ?? [])
      .map((t) => t.toLowerCase())
      .find((t) => !NOT_A_LABEL.has(t))
    return type ?? null
  }
  const all = (name: string) => props.filter((p) => p.name === name)
  const one = (name: string) => {
    const p = all(name)[0]
    return p ? unescaped(p.value) : null
  }
  const field = (p: Property): VCardField => ({
    value: unescaped(p.value),
    label: labelOf(p),
  })
  const photoProp = all("PHOTO")[0]
  const photo = photoProp
    ? (photoProp.params.ENCODING ?? []).some((e) => /^b(ase64)?$/i.test(e))
      ? `data:image/${(photoProp.params.TYPE?.[0] ?? "jpeg").toLowerCase()};base64,${photoProp.value}`
      : photoProp.value
    : null
  const n = one("N")
  const fn =
    one("FN") ?? (n ? parts(n).filter(Boolean).reverse().join(" ") : null)
  if (!fn) throw new Error("vcard: it names nobody (no FN, no N)")
  return {
    name: fn,
    nickname: one("NICKNAME"),
    photo,
    org: (() => {
      const o = one("ORG")
      return o ? parts(o).filter(Boolean).join(", ") : null
    })(),
    title: one("TITLE"),
    emails: all("EMAIL").map(field),
    phones: all("TEL").map(field),
    urls: all("URL").map(field),
    addresses: all("ADR").map((p) => ({
      value: parts(p.value).filter(Boolean).join(", "),
      label: labelOf(p),
    })),
    note: one("NOTE"),
    uid: one("UID"),
  }
}
