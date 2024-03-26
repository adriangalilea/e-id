"use client";
import { Button } from "@/components/ui/button";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

function dummy(prevState: { message: string }, data: FormData) {
  "use server";
  console.log("dummy");
  return {
    message: "Form data processed",
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={pending}
      type="submit"
      className="transition-all duration-100 ease-in-out"
    >
      {pending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Plus className="mr-2 size-4" />
      )}
      add user
    </Button>
  );
}

export default function AddForm() {
  const [state, formAction] = useFormState(dummy, {
    message: "",
  });
  return (
    <form action={formAction}>
      <SubmitButton />
    </form>
  );
}
