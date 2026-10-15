"use client";

import { ContactRound } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
/** The card's own save (`IdCard`'s `save`), in its foot's corner: printed on
 *  the card as its head is, the contact glyph and `vCard` in the head's type,
 *  size and ink (`--card-head`, mono, 60%), mirroring the country at the head's
 *  right. A field of the card that is also its action, never a button laid on
 *  it; brighter under the hand. Every length a share of the card's width (its
 *  container), so it is the same on every card. */
export function CardSave({ username }: { username: string }) {
  return (
    <a
      href={`/${username}.vcf`}
      download={`${username}.vcf`}
      aria-label="save contact (vCard)"
      title="save contact"
      className="flex items-center gap-[1.2cqw] font-mono text-(length:--card-head) text-foreground/60 transition-colors duration-150 hover:text-foreground in-data-pressing:text-foreground [&_svg]:size-[1.25em] [&_svg]:stroke-[1.5]"
    >
      vCard
      <ContactRound />
    </a>
  );
}

/** A person's card as a contact (lib/vcard): a link wearing the glass button's
 *  look, saved on a phone in one tap. A client component, so its link is made
 *  where Button reads it (a link handed through `render` from the server was
 *  not yet seen as one there, and drew as a button). */
export function SaveContact({
  username,
  size = "lg",
  className,
}: {
  username: string;
  /** A call-to-action size (`3xl`) where saving the contact is what a section
   *  is about. */
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Button
      material="glass"
      size={size}
      icon={<ContactRound strokeWidth={1.5} />}
      className={className}
      render={
        // biome-ignore lint/a11y/useAnchorContent: the Button draws the label
        <a href={`/${username}.vcf`} download={`${username}.vcf`} />
      }
    >
      save contact
    </Button>
  );
}
