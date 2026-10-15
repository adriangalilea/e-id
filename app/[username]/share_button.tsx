"use client"

import { Link as LinkIcon } from "lucide-react"
import { Addresses } from "@/components/addresses"
import { Button } from "@/components/ui/button"
import { Copy } from "@/components/ui/copy"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PROD_URL } from "@/lib/const"
import { embedOf } from "@/lib/embed"

/** One address to share: what it is, the address itself, and the registry's copy
 *  (@ag/copy), which says it copied in place. */
function Row({ name, value }: { name: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 border-border border-b px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-sm">{name}</span>
        <span className="truncate font-mono text-[11px] text-foreground/45">
          {value}
        </span>
      </div>
      <Copy value={value} label className="rounded-full" />
    </div>
  )
}

export default function ShareButton({ username }: { username: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            icon={<LinkIcon strokeWidth={1.5} />}
          />
        }
      >
        share
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-border border-b px-3">
          <Addresses username={username} />
        </div>
        {/* The card as a contact (lib/vcard): opened on a phone, it adds you. */}
        <Row name="contact card" value={`${PROD_URL}/${username}.vcf`} />
        {/* The card on your own site (app/embed.js): one script, one tag, the
            card drawn there and lit by the hand. */}
        <Row name="on your website" value={embedOf(username)} />
        {/* The same card as a byline, for the foot of a post or a project. */}
        <Row name="as a byline" value={embedOf(username, "compact")} />
        {/* The card as data (lib/card-schema), for a program. */}
        <Row name="as data" value={`${PROD_URL}/${username}/json`} />
      </PopoverContent>
    </Popover>
  )
}
