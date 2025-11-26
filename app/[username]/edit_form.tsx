"use client";

import { useActionState } from "react";
import { updateUserAndSocials } from "@/db/actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";

const initialState = {
  message: "",
  error: false,
};

export function EditForm({
  children,
  errorSlot,
}: {
  children: React.ReactNode;
  errorSlot?: (state: { message: string; error: boolean }) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(updateUserAndSocials, initialState);

  return (
    <form action={formAction} className="flex flex-1 flex-col mb-6 gap-6">
      {state.message && (
        <Alert
          variant={state?.error ? "destructive" : "default"}
          className="mt-6"
        >
          <Ban className="size-4" />
          <AlertTitle>{state?.message}</AlertTitle>
        </Alert>
      )}
      {errorSlot?.(state)}
      {children}
    </form>
  );
}

export function useEditFormState() {
  return useActionState(updateUserAndSocials, initialState);
}
