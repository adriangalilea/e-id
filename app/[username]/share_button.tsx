"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { Link as LinkIcon } from "lucide-react";
import { ClipboardCopy } from "lucide-react";
import Link from "next/link";
import { PROD_URL, EMOJI_DOMAIN, EMOJI_DOMAIN_PUNYCODE } from "@/lib/const";
import { EmojiDomain } from "@/components/brand";

export default function ShareButton({ username }: { username: string }) {
  const { toast } = useToast();
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="lg" />}>
        <LinkIcon strokeWidth={1} />
        share
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-0 p-1">
        {/* The brand first: 👤.to opens everywhere (next.config sends every
            browser but Safari on to e-id.to). */}
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={async () => {
            await navigator.clipboard.writeText(
              `https://${EMOJI_DOMAIN}/${username}`,
            );
            toast({
              variant: "success",
              title: "Copied to clipboard!",
              description: "The emoji URL is ready to be shared",
              action: (
                <ToastAction
                  altText="Why is there an emoji on the URL?"
                  className="w-fit"
                >
                  <Link href={"/about"} className="w-full">
                    Emoji URL?
                  </Link>
                </ToastAction>
              ),
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} />
          <span className="grow text-left">
            <EmojiDomain />
          </span>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={async () => {
            await navigator.clipboard.writeText(`${PROD_URL}/${username}`);
            toast({
              variant: "success",
              title: "Copied to clipboard!",
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} />
          <span className="grow text-left">
            e-id.to
          </span>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={async () => {
            await navigator.clipboard.writeText(
              `https://${EMOJI_DOMAIN_PUNYCODE}/${username}`,
            );
            toast({
              variant: "success",
              title: "Copied to clipboard!",
              description: "The punycode URL is ready to be shared.",
              action: (
                <ToastAction altText="What is this?" className="w-fit">
                  <Link href={"/about"} className="w-full">
                    What is this?
                  </Link>
                </ToastAction>
              ),
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} />
          <span className="grow text-left">
            twitter/instagram bio
          </span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
