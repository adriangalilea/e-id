"use client"

import { Link as LinkIcon } from "lucide-react"
import { useState } from "react"
import { Address } from "@/components/addresses"
import { Button } from "@/components/ui/button"
import { Copy } from "@/components/ui/copy"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type GuideHolder, XProfileGuide } from "@/components/x-profile-guide"
import { urlOf } from "@/lib/addresses"
import { PROD_URL } from "@/lib/const"
import { embedOf } from "@/lib/embed"

/** One address to share: what it is, the address itself, and the registry's copy
 *  (@ag/copy), which says it copied in place; `more`, a way to see it there. */
function Row({
  name,
  value,
  more,
}: {
  name: React.ReactNode
  value: string
  more?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-border border-b px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-sm">{name}</span>
        <span className="truncate font-mono text-[11px] text-foreground/45">
          {value}
        </span>
      </div>
      {more}
      <Copy value={value} label className="rounded-full" />
    </div>
  )
}

export default function ShareButton({ holder }: { holder: GuideHolder }) {
  const { username } = holder
  const [open, setOpen] = useState(false)
  const [guide, setGuide] = useState(false)
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
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
        <PopoverContent align="end" className="w-[23rem] gap-0 p-0">
          <div className="border-border border-b p-3">
            <Address path={`/${username}`} />
          </div>
          {/* Where most people put it, and the one place that wants it spelled
              out (lib/addresses CHECKED): the value to paste, and the guide
              that shows it there. */}
          <Row
            name="on your X profile"
            value={urlOf("spelled", `/${username}`)}
            more={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  setGuide(true)
                }}
              >
                show me
              </Button>
            }
          />
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
      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>your address on X</DialogTitle>
          </DialogHeader>
          <XProfileGuide holder={holder} />
        </DialogContent>
      </Dialog>
    </>
  )
}
