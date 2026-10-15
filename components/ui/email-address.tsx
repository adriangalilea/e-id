"use client"

// AN EMAIL ADDRESS, as the page shows one. An address is no profile (no face, no
// handle, nothing counted), so it is not social-profile's, but it stands beside one
// in the same shapes:
//
//   compact   social-profile's compact row: an envelope where a face stands, the
//             address, and what is done with it, copy it and write to it. For a
//             hover card on a link's mark, a list of where someone is.
//   window    the new message a mail app opens to it, drawn: what pressing it
//             leads to, for a story that shows where an address goes (a mail app
//             has no page to capture). A window, so plain whatever is round it.
//
// `address` takes a `mailto:` link or the bare address.

import { Mail, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Copy } from "@/components/ui/copy"
import {
  type Material,
  type Scheme,
  useMaterial,
} from "@/components/ui/material"
import { Panel } from "@/components/ui/panel"
import { cn } from "@/lib/utils"

export type EmailAddressForm = "compact" | "window"

export interface EmailAddressProps {
  /** `mailto:someone@example.com`, or the address. */
  address: string
  form?: EmailAddressForm
  /** The compact row's surface (a panel). Default drawn; inside a frame already
   *  drawn, the inset one (Panel). */
  frame?: boolean
  /** The compact row's material: default the nearest provider's. */
  material?: Material
  scheme?: Scheme
  className?: string
}

/** The address alone, whatever form it came in. */
export function bareAddress(address: string): string {
  return address.replace(/^mailto:/i, "").trim()
}

export function EmailAddress({
  address,
  form = "compact",
  frame,
  material,
  scheme,
  className,
}: EmailAddressProps) {
  const m = useMaterial(material)
  const bare = bareAddress(address)
  if (!bare.includes("@"))
    throw new Error(`EmailAddress: ${address} is no email address`)

  if (form === "window")
    return (
      <Panel
        data-slot="email-address"
        data-form="window"
        material="plain"
        radius="1rem"
        className={cn("w-full max-w-3xl", className)}
        bodyClassName="block p-0 text-xl"
        head={<span className="font-semibold text-xl">new message</span>}
      >
        <div className="flex items-center gap-3 border-current/10 border-b px-7 py-4">
          <span className="text-current/45">to:</span>
          {/* The recipient as a mail app chips it, in its own blue. */}
          <span className="rounded-full bg-[#0a84ff]/20 px-3 py-0.5 text-[#0a84ff]">
            {bare}
          </span>
        </div>
        <div className="flex gap-3 border-current/10 border-b px-7 py-4">
          <span className="text-current/45">subject:</span>
        </div>
        {/* The body, empty, the caret waiting in it. */}
        <div className="h-72 px-7 py-5">
          <span className="inline-block h-6 w-0.5 bg-[#0a84ff]" />
        </div>
      </Panel>
    )

  const framed = frame ?? true
  return (
    <Panel
      data-slot="email-address"
      data-form="compact"
      material={m}
      scheme={scheme}
      frame={framed}
      bodyClassName={cn(
        "flex-row items-center gap-3",
        framed ? "px-3 py-2.5" : "p-0",
      )}
      className={cn("font-sans text-sm", className)}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-current/[0.06] [&_svg]:size-5 [&_svg]:stroke-[1.5]">
        <Mail aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold leading-tight">{bare}</div>
        <div className="text-[13px] text-current/55">email</div>
      </div>
      <Copy value={bare} />
      <Button
        render={<a href={`mailto:${bare}`} />}
        variant="ghost"
        size="icon"
        aria-label={`write to ${bare}`}
      >
        <PenLine aria-hidden />
      </Button>
    </Panel>
  )
}
