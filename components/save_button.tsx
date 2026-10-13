"use client";

import { Button } from "@/components/ui/button";
import { LoaderCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      type="submit"
      variant="outline"
      size="lg"
      className="self-end hover:bg-tone-ok/15 hover:text-tone-ok"
    >
      {pending ? (
        <LoaderCircle strokeWidth={1} size="18" className="animate-spin" />
      ) : (
        <Save strokeWidth={1} size="18" />
      )}
      <span className="ml-2">save changes</span>
    </Button>
  );
}
