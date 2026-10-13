"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { Pin, PinOff } from "lucide-react";
import { pinCommentToggle } from "@/db/actions";
import { SelectComment } from "@/db/schema";

export default function PinComment({
  commentId,
  pinned,
  onChange,
}: {
  commentId: SelectComment["id"];
  pinned: boolean;
  onChange: () => void;
}) {
  return (
    <form
      action={async () => {
        await pinCommentToggle(commentId);
        onChange();
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              {pinned ? <PinOff strokeWidth={1} /> : <Pin strokeWidth={1} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{pinned ? "unpin" : "pin"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </form>
  );
}
