"use client";

import { SelectSocial } from "@/db/schema";
import { removeSocial } from "@/db/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export default function RemoveSocialButton({
  platformId,
}: {
  platformId: SelectSocial["id"];
}) {
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                key={platformId}
                variant="outline"
                size="icon-lg"
                className="hover:bg-tone-bad/15 hover:text-tone-bad"
              >
                <Trash2 strokeWidth={1} />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>remove</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              await removeSocial(platformId);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
