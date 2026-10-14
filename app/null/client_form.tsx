"use client";
import { useActionState } from "react";

import { setUsernameFromForm } from "@/db/actions";
import { InputGroup } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiDomain } from "@/components/brand";
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
      <Label htmlFor="username">username</Label>
      <div className="flex gap-2">
        {/* The handle as the address it makes, the domain before it in the
            well (@ag/input), as the home's card writes it. Starts from the
            handle written there (lib/draft); keyed by it, as the browser's
            draft is read only after the first paint. */}
        <InputGroup
          key={draft.handle}
          type="text"
          id="username"
          placeholder="username"
          name="username"
          defaultValue={draft.handle}
          required
          material="plain"
          size="lg"
          className="min-w-0 grow font-mono"
          prefix={<EmojiDomain path="/" />}
        />
        <Button
          variant="outline"
          type="submit"
          size="icon-lg"
          aria-label="take it"
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
