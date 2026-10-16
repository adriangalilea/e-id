"use client"

import { EmojiDomain } from "@/components/brand"
import { Copy } from "@/components/ui/copy"
import { useRemembered } from "@/components/ui/remembered"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FORM_IDS, FORMS, type FormId, formOf, urlOf } from "@/lib/addresses"
import { oneOf, setting } from "@/lib/remembered-core"
import { cn } from "@/lib/utils"

// HANDING OUT AN ADDRESS ON THE DOMAIN IT IS GOING TO (lib/addresses): one choice
// of domain, remembered for good and the same in every place that copies one (the
// share menu, the short links), so choosing eid.to once copies eid.to everywhere.
// The choice is made where the address is, as a clone address's protocol is:
// the domains in a bar above it, what the chosen one is for under it.
//
//   <Address path="/you" />          one address: the bar, the address, its copy
//   <AddressFormPicker />            the bar alone, over a list of addresses
//   <AddressText form={id} path />   an address as shown, on a form

const FORM = setting<FormId>("e-id:address-form", {
  initial: "emoji",
  keep: "always",
  parse: oneOf(FORM_IDS),
})

const isForm = oneOf(FORM_IDS)

/** The domain chosen to copy, and its setter. */
export function useAddressForm() {
  return useRemembered(FORM)
}

/** An address as shown on a form: the emoji domain as e-ID writes it (its mark),
 *  the others as text. */
export function AddressText({
  form,
  path,
  className,
}: {
  form: FormId
  path: string
  className?: string
}) {
  return form === "emoji" ? (
    <EmojiDomain path={path} className={className} />
  ) : (
    <span className={cn("whitespace-nowrap", className)}>
      {formOf(form).host}
      {path}
    </span>
  )
}

/** The domains side by side, the chosen one lit. */
export function AddressFormPicker({ className }: { className?: string }) {
  const [form, setForm] = useAddressForm()
  return (
    <ToggleGroup
      size="sm"
      aria-label="the domain to copy"
      value={form}
      onValueChange={(v) => {
        const id = isForm(v)
        if (!id) throw new Error(`no address form "${v}"`)
        setForm(id)
      }}
      className={className}
    >
      {FORMS.map((f) => (
        <ToggleGroupItem key={f.id} value={f.id} className="font-mono">
          {f.id === "emoji" ? <EmojiDomain /> : f.host}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** One address to hand out: the domains above it, the address on the chosen one
 *  as a link with its copy, and what that domain is for under it. */
export function Address({ path }: { path: string }) {
  const [form] = useAddressForm()
  const url = urlOf(form, path)
  return (
    <div className="flex flex-col gap-2.5">
      <AddressFormPicker className="self-start" />
      <div className="flex items-center gap-3">
        <a
          href={url}
          className="min-w-0 grow truncate font-mono text-foreground/90 text-sm underline decoration-foreground/25 underline-offset-[0.3em] transition-colors hover:decoration-foreground/70"
        >
          <AddressText form={form} path={path} />
        </a>
        <Copy value={url} label className="rounded-full" />
      </div>
      <p className="text-foreground/45 text-xs">{formOf(form).for}</p>
    </div>
  )
}
