"use client";
import { createRandomUser } from "@/db/actions";
import { Button } from "@/components/ui/button";
import { useFormState, useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending}>
      Add user
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
