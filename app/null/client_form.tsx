"use client";
import { useActionState } from "react";

import { setUsernameFromForm } from "@/db/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ban, Check } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useDraft } from "@/lib/draft";

const initialState = {
  message: "",
  error: false,
};

export function ClientForm() {
  const [state, formAction] = useActionState(setUsernameFromForm, initialState);
  const draft = useDraft();

  return (
    <form action={formAction} className="flex flex-col justify-between gap-2">
      <label htmlFor="username">username</label>
      <div className="flex">
        {/* Starts from the handle written on the home's card (lib/draft); keyed
            by it, as the browser's draft is read only after the first paint. */}
        <Input
          key={draft.handle}
          type="text"
          id="username"
          placeholder="username"
          name="username"
          defaultValue={draft.handle}
          required
        />
        <Button
          variant="outline"
          type="submit"
          size="icon-lg"
          className="shrink-0"
        >
          <Check className="size-4" />
        </Button>
      </div>
      {state.message && (
        <Alert variant={state?.error ? "destructive" : "default"}>
          <Ban className="size-4" />
          <AlertTitle>{state?.message}</AlertTitle>
        </Alert>
      )}

      <p aria-live="polite" className="sr-only">
        {state?.message}
      </p>
    </form>
  );
}
