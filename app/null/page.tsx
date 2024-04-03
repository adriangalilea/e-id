export const dynamic = "force-dynamic";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/auth";
import { TriangleAlert } from "lucide-react";
import { ClientForm } from "./client_form";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function Page() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) redirect("/");
  if (session.user.username && session.user.username_normalized) {
    revalidatePath(`/${session.user.username_normalized}`);
    revalidatePath(`/${session.user.username_normalized}/edit`);
    revalidatePath(`/${session.user.username}`);
    revalidatePath(`/${session.user.username}/edit`);
    redirect(`/${session.user.username}`);
  }

  return (
    <div className="flex flex-col justify-between gap-4">
      <Alert variant="warning">
        <TriangleAlert className="size-4" />
        <AlertTitle>{"You don't have a username!"}</AlertTitle>
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
