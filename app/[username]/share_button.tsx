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

export default function ShareButton({ username }: { username: string }) {
  const { toast } = useToast();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <LinkIcon strokeWidth={1} className="pr-2" />
          <span className="prose prose-zinc dark:prose-invert font-light">
            share
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-min flex flex-col p-0">
        <Button
          variant="ghost"
          className="w-full flex"
          onClick={async () => {
            await navigator.clipboard.writeText(`https://e-id.to/${username}`);
            toast({
              variant: "success",
              title: "Copied to clipboard!",
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} className="pr-2" />
          <span className="prose prose-zinc dark:prose-invert font-light text-left grow">
            e-id.to
          </span>
        </Button>
        <Button
          variant="ghost"
          className="w-full flex"
          onClick={async () => {
            await navigator.clipboard.writeText(`https://👤.to/${username}`);
            toast({
              variant: "success",
              title: "Copied to clipboard!",
              description: "The emoji URL is ready to be shared",
              action: (
                <ToastAction
                  altText="Why is there an emoji on the URL?"
                  className="w-fit"
                >
                  <Link href={"/about"} className=" w-full">
                    Emoji URL?
                  </Link>
                </ToastAction>
              ),
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} className="pr-2" />
          <span className="prose prose-zinc dark:prose-invert font-light text-left grow">
            👤.to
          </span>
        </Button>
        <Button
          variant="ghost"
          className="w-full flex"
          onClick={async () => {
            await navigator.clipboard.writeText(
              `https://xn--mq8h.to/${username}`,
            );
            toast({
              variant: "success",
              title: "Copied to clipboard!",
              description: "The punycode URL is ready to be shared.",
              action: (
                <ToastAction altText="What is this?" className="w-fit">
                  <Link href={"/about"} className=" w-full">
                    What is this?
                  </Link>
                </ToastAction>
              ),
            });
          }}
        >
          <ClipboardCopy strokeWidth={1} className="pr-2" />
          <span className="prose prose-zinc dark:prose-invert font-light text-left grow">
            twitter/instagram bio
          </span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
