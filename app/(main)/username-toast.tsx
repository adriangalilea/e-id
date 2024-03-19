"use client";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect } from "react";

export default function UsernameToast() {
  const { toast } = useToast();
  useEffect(() => {
    toast({
      variant: "destructive",
      title: "Uh oh! Username taken.",
      description: "Someone already had your auth provider username.",
      action: <ToastAction altText="Set username">Set username</ToastAction>,
    });
  }, [toast]);
  return <></>;
}
