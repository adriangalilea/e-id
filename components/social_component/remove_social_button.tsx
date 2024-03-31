"use client";

import { SelectSocial, SelectUser } from "@/db/schema";
import { removeSocial } from "@/db/actions";
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

export default function RemoveSocialButton({
  userId,
  platformId,
}: {
  userId: SelectUser["id"];
  platformId: SelectSocial["id"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          key={platformId}
          className="dark:bg-zinc-50/5 bg-zinc-950/5"
          size="icon"
          variant="destructiveGhost"
        >
          <X />
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
                await removeSocial(userId, platformId);
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
