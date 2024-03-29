"use client";

import { SelectComment } from "@/db/schema";
import { deleteComment, removeSocial } from "@/db/actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RemoveComment({
  commentId,
}: {
  commentId: SelectComment["id"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructiveGhost"
          size="icon"
          className="bg-zinc-500/20"
        >
          <X strokeWidth={1} className="opacity-60" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            asChild
            className="border border-red-500/10 bg-red-500/20 text-red-500"
            variant="destructiveGhost"
          >
            <AlertDialogAction
              onClick={async () => {
                await deleteComment(commentId);
              }}
            >
              Delete
            </AlertDialogAction>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
