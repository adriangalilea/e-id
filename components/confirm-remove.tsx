"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tip } from "@/components/ui/tooltip";

/** A remove that asks first: a bin named "remove" by its tooltip, opening a
 *  dialog (@ag/dialog) that says it cannot be undone, the removal its main
 *  action. One for whatever is removed (a comment, a link). */
export default function ConfirmRemove({
  onRemove,
  side,
}: {
  onRemove: () => Promise<void>;
  /** where the tooltip shows, beside the bin */
  side?: React.ComponentProps<typeof Tip>["side"];
}) {
  return (
    <Dialog>
      <Tip content="remove" side={side}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="remove"
              className="hover:bg-tone-bad/15 hover:text-tone-bad"
            />
          }
        >
          <Trash2 strokeWidth={1} />
        </DialogTrigger>
      </Tip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose
            render={<Button variant="destructive" />}
            onClick={onRemove}
          >
            Delete
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
