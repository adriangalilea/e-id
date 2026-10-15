"use client";

import { ContactRound } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";

/** The card's own save, set on its photo (`IdCard`'s `save`): the one solid
 *  thing on the card, white as a contact card's add is, so it reads as the
 *  card's action and never as one of its links. Every length a share of the
 *  card's width (its container), so it is the same on every card. */
export function CardSave({ username }: { username: string }) {
  return (
    <a
      href={`/${username}.vcf`}
      download={`${username}.vcf`}
      aria-label="save contact"
      className="flex h-[7cqw] items-center gap-[1.2cqw] whitespace-nowrap rounded-full bg-white px-[2.6cqw] font-medium text-[3.2cqw] text-black shadow-[0_0.8cqw_2.4cqw_-0.6cqw_rgb(0_0_0/0.6)] transition-[scale,background-color] duration-150 hover:bg-white/90 active:scale-95 in-data-pressing:scale-95 [&_svg]:size-[3.6cqw]"
    >
      <ContactRound strokeWidth={2} />
      save
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
