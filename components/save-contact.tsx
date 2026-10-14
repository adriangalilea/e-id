"use client";

import { ContactRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A person's card as a contact (lib/vcard): a link wearing the glass button's
 *  look, saved on a phone in one tap. A client component, so its link is made
 *  where Button reads it (a link handed through `render` from the server was
 *  not yet seen as one there, and drew as a button). */
export function SaveContact({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  return (
    <Button
      material="glass"
      size="lg"
      className={className}
      render={
        // biome-ignore lint/a11y/useAnchorContent: the Button draws the label
        <a href={`/${username}.vcf`} download={`${username}.vcf`} />
      }
    >
      <ContactRound strokeWidth={1.5} />
      save contact
    </Button>
  );
}
