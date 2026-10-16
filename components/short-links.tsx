"use client"

import { Link2, Plus } from "lucide-react"
import { useState } from "react"
import {
  AddressFormPicker,
  AddressText,
  useAddressForm,
} from "@/components/addresses"
import { WRITTEN_HERE } from "@/components/card-fields"
import { Button } from "@/components/ui/button"
import { Copy } from "@/components/ui/copy"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormSubmit,
  FormSummary,
  useForm,
  useFormState,
} from "@/components/ui/form"
import { InputGroup } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { deleteShortLink, myShortLinks, saveShortLink } from "@/db/actions"
import { urlOf } from "@/lib/addresses"
import {
  type KeptShortLink,
  type ShortLink,
  shortLinkSchema,
} from "@/lib/card-edit"
import { linkCode } from "@/lib/link-names"
import { hostOf } from "@/lib/web-preview-facts"

// YOUR SHORT LINKS: the links of your own you hand out, `/you/<name>`, each
// going anywhere, as many as you keep, never on your card unless you put one
// there (lib/card-edit: the card shows where you are, a short link is what you
// give out). A list from the profile's owner actions: each its address to copy,
// on the domain chosen above it (components/addresses), where it goes, how often
// it opened, when it stops; pressed, it opens to be changed; "new short link"
// adds one, its name made up until you rename it.

const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** Whether a short link still opens, as the route decides it (app/[username]/[link]):
 *  before the end of its day, and with opens left. */
function opens(a: KeptShortLink, now: number) {
  const before = !a.expires || Date.parse(`${a.expires}T23:59:59.999Z`) > now
  const left = a.maxVisits === null || a.visits < a.maxVisits
  return before && left
}

/** What a short link says of itself under its name: where it goes, how often it
 *  opened, when it stops, whether it is on the card. */
function said(a: KeptShortLink, now: number): string {
  const parts = [hostOf(a.value)]
  parts.push(a.visits === 1 ? "opened once" : `opened ${a.visits} times`)
  if (!opens(a, now)) parts.push("stopped")
  else {
    if (a.expires) parts.push(`until ${DAY.format(new Date(a.expires))}`)
    if (a.maxVisits !== null)
      parts.push(
        a.maxVisits - a.visits === 1
          ? "one open left"
          : `${a.maxVisits - a.visits} opens left`,
      )
  }
  if (a.public) parts.push("on your card")
  return parts.join(" · ")
}

/** The button beside share and edit, and the list it opens. */
export function ShortLinks({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [kept, setKept] = useState<KeptShortLink[] | null>(null)
  /** The short link being written: one of `kept` by id, "new", or none. */
  const [editing, setEditing] = useState<string | null>(null)
  const load = () => myShortLinks().then(setKept)
  const [form] = useAddressForm()
  const now = Date.now()
  const writing =
    editing === "new"
      ? null
      : (kept?.find((a) => a.id === editing) ?? undefined)
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        icon={<Link2 strokeWidth={1.5} />}
        onClick={() => {
          setOpen(true)
          setEditing(null)
          void load()
        }}
      >
        short links
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] max-w-lg gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>your short links</DialogTitle>
            <DialogDescription>
              Links of your own at{" "}
              <AddressText form={form} path={`/${username}/…`} />, to hand out.
              They go anywhere and can stop on a day or after a number of opens;
              one that never stops can also be on your card.
            </DialogDescription>
          </DialogHeader>
          {editing !== null ? (
            <ShortLinkForm
              key={editing}
              username={username}
              link={writing ?? null}
              onDone={() => {
                setEditing(null)
                void load()
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  icon={<Plus strokeWidth={1.5} />}
                  onClick={() => setEditing("new")}
                >
                  new short link
                </Button>
                {kept !== null && kept.length > 0 && <AddressFormPicker />}
              </div>
              {kept === null ? null : kept.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  None yet: a CV, a talk, a file, anything you send people to.
                </p>
              ) : (
                <ShortLinkList
                  username={username}
                  kept={kept}
                  now={now}
                  onOpen={setEditing}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The short links as a list, each its address on the domain chosen to copy
 *  (components/addresses), what it says of itself, and its copy; pressed, it
 *  opens to be changed. */
export function ShortLinkList({
  username,
  kept,
  now,
  onOpen,
}: {
  username: string
  kept: KeptShortLink[]
  now: number
  onOpen: (id: string) => void
}) {
  const [form] = useAddressForm()
  return (
    <ul className="flex flex-col">
      {kept.map((a) => {
        const path = `/${username}/${a.slug}`
        return (
          <li
            key={a.id}
            className="flex items-center gap-2 border-border border-t py-2 first:border-t-0"
          >
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              className="flex min-w-0 flex-1 flex-col items-start rounded-md px-1 py-0.5 text-left transition-colors hover:bg-foreground/[0.04]"
            >
              <AddressText
                form={form}
                path={path}
                className={`max-w-full truncate font-mono text-sm ${opens(a, now) ? "text-foreground/85" : "text-foreground/40 line-through"}`}
              />
              <span className="max-w-full truncate text-foreground/50 text-xs">
                {said(a, now)}
              </span>
            </button>
            <Copy
              value={urlOf(form, path)}
              className="size-9 shrink-0 rounded-full"
            />
          </li>
        )
      })}
    </ul>
  )
}

/** One short link written: a new one (`link` null, its name made up) or one of
 *  yours, with the way to delete it. */
function ShortLinkForm({
  username,
  link,
  onDone,
}: {
  username: string
  link: KeptShortLink | null
  onDone: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const form = useForm<ShortLink>({
    initial: link
      ? {
          id: link.id,
          value: link.value,
          slug: link.slug,
          label: link.label,
          expires: link.expires,
          maxVisits: link.maxVisits,
          public: link.public,
        }
      : {
          id: null,
          value: "",
          slug: linkCode(),
          label: "",
          expires: "",
          maxVisits: null,
          public: false,
        },
    schema: shortLinkSchema,
    onSubmit: async (values) => {
      const saved = await saveShortLink(values)
      if (!saved.ok) return { errors: saved.errors }
      onDone()
    },
  })
  const ends = useFormState(
    form,
    (s) => Boolean(s.values.expires) || s.values.maxVisits !== null,
  )
  const shown = useFormState(form, (s) => s.values.public)
  // Stopping takes it off the card, in the same change.
  const offCard = () => form.setValue("public", false)
  return (
    <Form form={form} className="gap-4">
      <form.Field name="value" label="goes to">
        {(c) => (
          <InputGroup
            {...WRITTEN_HERE}
            spellCheck={false}
            autoCapitalize="none"
            inputMode="url"
            placeholder="https://…"
            autoFocus={!link}
            {...c.input}
          />
        )}
      </form.Field>
      <form.Field name="slug" label="address">
        {(c) => (
          <InputGroup
            {...WRITTEN_HERE}
            spellCheck={false}
            autoCapitalize="none"
            prefix={`${username}/`}
            {...c.input}
          />
        )}
      </form.Field>
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="expires" label="until" aside="optional">
          {(c) => (
            <InputGroup
              type="date"
              {...c.input}
              onChange={(e) => {
                c.input.onChange(e)
                if (e.target.value) offCard()
              }}
            />
          )}
        </form.Field>
        <form.Field
          name="maxVisits"
          label="opens"
          aside="optional, 1 for one use"
        >
          {(c) => (
            <InputGroup
              type="number"
              min={1}
              inputMode="numeric"
              value={c.value ?? ""}
              onChange={(e) => {
                const n = e.target.value === "" ? null : Number(e.target.value)
                c.onValueChange(n)
                if (n !== null) offCard()
              }}
            />
          )}
        </form.Field>
      </div>
      <form.Field
        name="public"
        label="on your card"
        aside={ends ? "not while it stops opening" : undefined}
        orientation="horizontal"
      >
        {(c) => (
          <Switch
            checked={c.value && !ends}
            disabled={ends}
            onCheckedChange={(checked) => c.onValueChange(checked)}
          />
        )}
      </form.Field>
      {shown && (
        <form.Field name="label" label="its name on your card">
          {(c) => (
            <InputGroup
              {...WRITTEN_HERE}
              placeholder="my CV, a talk, the book"
              {...c.input}
            />
          )}
        </form.Field>
      )}
      <FormSummary />
      <div className="flex items-center gap-2">
        {link && (
          <Button
            type="button"
            variant="destructive"
            loading={deleting}
            onClick={async () => {
              setDeleting(true)
              await deleteShortLink(link.id)
              onDone()
            }}
          >
            delete
          </Button>
        )}
        <span className="flex-1" />
        <Button type="button" variant="ghost" onClick={onDone}>
          back
        </Button>
        <FormSubmit>save</FormSubmit>
      </div>
    </Form>
  )
}
