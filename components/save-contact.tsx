"use client";

import { ContactRound } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
import { foilGradient } from "@/lib/foil";

/** The card's own save (`IdCard`'s `save`), under the name: printed in the card's
 *  material, its edge the hologram's foil, the one thing on the card that wears
 *  it, so it reads as the card's action and never as one of its links. The foil
 *  is fixed to the window as the hologram's is, so it shifts as the card moves,
 *  and lights fully under the hand. Every length a share of the card's width
 *  (its container), so it is the same on every card. */
export function CardSave({ username }: { username: string }) {
  return (
    <a
      href={`/${username}.vcf`}
      download={`${username}.vcf`}
      className="group/save relative flex h-[7.4cqw] items-center gap-[1.4cqw] self-start whitespace-nowrap rounded-full bg-white/[0.06] px-[3cqw] font-medium text-[3.2cqw] text-foreground/90 transition-[scale,background-color] duration-150 hover:bg-white/[0.1] active:scale-95 in-data-pressing:scale-95 [&_svg]:size-[3.6cqw] [&_svg]:stroke-[1.6]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] p-px opacity-60 transition-opacity duration-300 [mask-composite:exclude] [mask-clip:content-box,border-box] [mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] group-hover/save:opacity-100 in-data-pressing:opacity-100"
        style={{ background: `${foilGradient()} fixed` }}
      />
      <ContactRound />
      save contact
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
