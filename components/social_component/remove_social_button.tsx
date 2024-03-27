"use client";

import { SelectSocial, SelectUser, SocialPlatform } from "@/db/schema";
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
          className="!h-10 !w-10 !p-0 text-red-500"
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
            className="bg-red-500/20 border border-red-500/10 text-red-500"
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
