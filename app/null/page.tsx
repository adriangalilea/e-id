import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { ClientForm } from "./client_form";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { ChipSync } from "@/components/session/chip-sync";
import { chipOf } from "@/lib/chip";
import { Column } from "@/components/frame";

// Where a signed-in user without a username is sent (components/session/
// session-chip) to choose one. Signed out, it says so and corrects the display
// cookie, which is what sent the browser here.
async function NullPageContent() {
  const session = await getSession();
  if (!session) {
    return (
      <>
        <ChipSync chip={null} />
        <p className="prose prose-zinc dark:prose-invert">You are signed out.</p>
      </>
    );
  }
  if (session.user.username) redirect(`/${session.user.username}`);

  return (
    <div className="flex flex-col justify-between gap-4">
      <ChipSync chip={chipOf(session.user)} />
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

export default async function Page() {
  return (
    <Column>
      <Suspense fallback={<div>Loading...</div>}>
        <NullPageContent />
      </Suspense>
    </Column>
  );
}
