"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "@/components/ui/copy";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { PROD_URL, EMOJI_DOMAIN, EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { EmojiDomain } from "@/components/brand";

/** One address to share: what it is, the address itself, and the registry's copy
 *  (@ag/copy), which says it copied in place. */
function Row({ name, value }: { name: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-sm">{name}</span>
        <span className="truncate font-mono text-[11px] text-foreground/45">
          {value}
        </span>
      </div>
      <Copy value={value} label className="rounded-full" />
    </div>
  );
}

export default function ShareButton({ username }: { username: string }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="lg" />}>
        <LinkIcon strokeWidth={1} />
        share
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        {/* The brand first: 👤.to opens everywhere (next.config sends every
            browser but Safari on to e-id.to). */}
        <Row
          name={<EmojiDomain />}
          value={`https://${EMOJI_DOMAIN}/${username}`}
        />
        <Row name="e-id.to" value={`${PROD_URL}/${username}`} />
        <Row
          name="twitter/instagram bio"
          value={`https://${EMOJI_DOMAIN_PUNYCODE}/${username}`}
        />
        {/* The card as a contact (lib/vcard): opened on a phone, it adds you. */}
        <Row name="contact card" value={`${PROD_URL}/${username}.vcf`} />
        {/* The card on your own site (app/embed.js): one script, one tag, the
            card drawn there and lit by the hand. */}
        <Row
          name="on your website"
          value={`<script type="module" src="${PROD_URL}/embed.js"></script><e-id-card handle="${username}"></e-id-card>`}
        />
        <Link
          href="/about"
          className="px-3 py-2.5 font-mono text-[11px] text-foreground/55 hover:text-foreground"
        >
          Emoji URL?
        </Link>
      </PopoverContent>
    </Popover>
  );
}
