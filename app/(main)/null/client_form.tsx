"use client";

import { useFormState } from "react-dom";
import { setUsername } from "@/db/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ban, Check } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

const initialState = {
  message: "",
  error: false,
};

export function ClientForm() {
  const [state, formAction] = useFormState(setUsername, initialState);

  return (
    <form action={formAction} className="flex justify-between flex-col gap-2">
      <label htmlFor="username">username</label>
      <div className="flex">
        <Input
          type="text"
          id="username"
          placeholder="username"
          name="username"
          required
        />
        <Button
          variant="outline"
          type="submit"
          size="icon"
          className="shrink-0"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
      {state.message && (
        <Alert variant={state?.error ? "destructive" : "default"}>
          <Ban className="h-4 w-4" />
          <AlertTitle>{state?.message}</AlertTitle>
        </Alert>
      )}

      <p aria-live="polite" className="sr-only">
        {state?.message}
      </p>
    </form>
  );
}
