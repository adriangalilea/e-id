"use client";
import { createRandomUser } from "@/db/actions";
import { Button } from "@/components/ui/button";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={pending}
      type="submit"
      className="transition-all ease-in-out duration-100"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      add user
    </Button>
  );
}

export default function AddForm() {
  const [state, formAction] = useFormState(createRandomUser, {
    message: "",
  });
  return (
    <form action={formAction}>
      <SubmitButton />
    </form>
  );
}
