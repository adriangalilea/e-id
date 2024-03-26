"use client";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect } from "react";

export default function UsernameToast() {
  const { toast } = useToast();
  useEffect(() => {
    toast({
      variant: "destructive",
      title: "Uh oh! You can't do that.",
      description: "If that's your profile you must login first.",
      action: <ToastAction altText="Set username">Login</ToastAction>,
    });
  }, [toast]);
  return <></>;
}
