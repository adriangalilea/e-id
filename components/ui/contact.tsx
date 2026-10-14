import { cn } from "@/lib/utils"
import {
  parseVcard,
  type VCard,
  type VCardField,
} from "@/lib/vcard-core"
import { Image } from "@/components/ui/image"

// A CONTACT AS A PHONE SHOWS ONE, drawn from a vCard (lib/vcard-core): the face
// round at the top, the name under it and who they are (nickname, organisation),
// then each field a row, what it is called small above what it holds, a link
// where it opens something (a page, mail, a call). Given the vCard's text or its
// parsed `VCard`. No frame of its own: it is content, set in whatever holds it (a
// box of tabs beside the file itself, a dialog, a page), and drawn in the current
// colour at alpha, so it reads in either material and scheme. No state: it renders
// on the server too.
//
//   <Contact vcard={vcfText} />

/** A row's value as a link, where it opens something. */
function hrefOf(kind: "email" | "phone" | "url" | "address", value: string) {
  if (kind === "email") return `mailto:${value}`
  if (kind === "phone") return `tel:${value.replace(/[^\d+]/g, "")}`
  if (kind === "url") return value
  return null
}

/** A URL as people read it: no scheme, no `www.`, no trailing slash. */
const readable = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

/** What a row is called when its field has no label of its own. */
const KIND: Record<"email" | "phone" | "url" | "address", string> = {
  email: "email",
  phone: "phone",
  url: "page",
  address: "address",
}

function Row({
  kind,
  field,
}: {
  kind: "email" | "phone" | "url" | "address"
  field: VCardField
}) {
  const href = hrefOf(kind, field.value)
  const shown = kind === "url" ? readable(field.value) : field.value
  return (
    <li
      data-slot="contact-row"
      className="flex min-w-0 flex-col gap-0.5 py-2.5"
    >
      <span className="text-current/45 text-xs">
        {field.label ?? KIND[kind]}
      </span>
      {href ? (
        <a
          href={href}
          className="truncate text-[15px] text-current/90 underline-offset-4 hover:underline"
        >
          {shown}
        </a>
      ) : (
        <span className="truncate text-[15px] text-current/90">{shown}</span>
      )}
    </li>
  )
}

/** The initials of a name, for a contact with no photo. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

export function Contact({
  vcard,
  className,
}: {
  /** The vCard's text, or it parsed (lib/vcard-core, `parseVcard`). */
  vcard: string | VCard
  className?: string
}) {
  const c = typeof vcard === "string" ? parseVcard(vcard) : vcard
  const who = [c.nickname, c.title, c.org].filter(Boolean).join(" · ")
  const rows = [
    ...c.phones.map((field) => ({ kind: "phone" as const, field })),
    ...c.emails.map((field) => ({ kind: "email" as const, field })),
    ...c.urls.map((field) => ({ kind: "url" as const, field })),
    ...c.addresses.map((field) => ({ kind: "address" as const, field })),
  ]
  return (
    <article
      data-slot="contact"
      className={cn("flex w-full flex-col items-center gap-5", className)}
    >
      <div
        data-slot="contact-photo"
        className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-current/8 font-medium text-2xl text-current/60"
      >
        {c.photo ? (
          <Image src={c.photo} alt="" className="size-full object-cover" />
        ) : (
          initials(c.name)
        )}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="font-medium text-2xl tracking-[-0.02em]">{c.name}</h3>
        {who && <p className="text-current/55 text-sm">{who}</p>}
      </div>
      {rows.length > 0 && (
        <ul className="flex w-full flex-col divide-y divide-current/10 border-current/10 border-y">
          {rows.map(({ kind, field }) => (
            <Row key={`${kind}:${field.value}`} kind={kind} field={field} />
          ))}
        </ul>
      )}
      {c.note && (
        <p className="w-full whitespace-pre-line text-current/60 text-sm">
          {c.note}
        </p>
      )}
    </article>
  )
}
