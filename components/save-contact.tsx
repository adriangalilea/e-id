"use client";

import { ContactRound } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
/** The card's own save (`IdCard`'s `save`), in its foot's corner: the contact
 *  glyph alone in a quiet circle, a faint fill and a hairline. Distinct by
 *  being the one filled thing on a card of outlined glyphs, never by colour.
 *  Every length a share of the card's width (its container), so it is the same
 *  on every card. */
export function CardSave({ username }: { username: string }) {
  return (
    <a
      href={`/${username}.vcf`}
      download={`${username}.vcf`}
      aria-label="save contact"
      title="save contact"
      className="grid size-[7cqw] place-items-center rounded-full bg-white/[0.07] text-foreground/75 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-[scale,background-color,color] duration-150 hover:bg-white/[0.12] hover:text-foreground active:scale-95 in-data-pressing:scale-95 in-data-pressing:bg-white/[0.12] [&_svg]:size-[3.4cqw] [&_svg]:stroke-[1.5]"
    >
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
