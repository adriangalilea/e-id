import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/auth";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientForm } from "./client_form";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) return null;

  if (session.user.username) redirect("/");

  return (
    <div className="flex justify-between flex-col gap-4">
      <Alert variant="warning">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>You don't have a username!</AlertTitle>
        <AlertDescription>
          This happened because the inferred username from your authentication
          provider was already taken(or because you were naughty...).
          <br />
          <br />
          Please select one in order to use e-ID.
        </AlertDescription>
      </Alert>
      <ClientForm />
    </div>
  );
}
