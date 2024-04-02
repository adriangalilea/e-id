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
  canPin,
}: {
  commentId: SelectComment["id"];
  pinned: boolean;
  canPin: boolean;
}) {
  return (
    <>
      {canPin && (
        <form
          action={async () => {
            "use server";
            await pinCommentToggle(commentId);
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  {pinned ? (
                    <PinOff strokeWidth={1} />
                  ) : (
                    <Pin strokeWidth={1} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>pin</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      )}
    </>
  );
}
