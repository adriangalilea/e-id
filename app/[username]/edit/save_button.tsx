"use client";

import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      type="submit"
      variant="secondary"
      size="icon"
      className="self-end hover:bg-emerald-500/10 hover:text-emerald-500"
    >
      <Save strokeWidth={1} />
    </Button>
  );
}
