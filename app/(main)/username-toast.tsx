"use client";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect } from "react";

export default function UsernameToast({
  isUsernameNull,
}: {
  isUsernameNull: boolean;
}) {
  const { toast } = useToast();
  useEffect(() => {
    if (!isUsernameNull) return;
    toast({
      variant: "destructive",
      title: "Uh oh! Username taken.",
      description: "Someone already had your auth provider username.",
      action: <ToastAction altText="Set username">Set username</ToastAction>,
    });
  }, [toast, isUsernameNull]);
  return <></>;
}
