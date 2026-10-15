"use client";

import { ContactRound } from "lucide-react";
import { ON_CARD } from "@/components/card-shape";
import { Button, type ButtonSize } from "@/components/ui/button";
import { cn } from "@/lib/utils";
/** The card's own save (`IdCard`'s `save`), in its foot's corner, mirroring the
 *  country at its head: VCARD as a small label (capitals, tracked wide, smaller
 *  than the head) and the contact glyph, a step quieter than the address.
 *  Under the hand it is the address's own (`CopyAddress`): the same pill,
 *  padding and brightening. Dimmed as one shape (`opacity` over an opaque
 *  ink), so the glyph's crossing strokes never paint twice. Every length a
 *  share of the card's width (its container). */
export function CardSave({ username }: { username: string }) {
  return (
    <a
      href={`/${username}.vcf`}
      download={`${username}.vcf`}
      aria-label="save contact (vCard)"
      title="save contact"
      className={cn(
        ON_CARD,
        // A small label, tracked wide in capitals, a step under the head's
        // ink; dimmed as one shape (`opacity` over an opaque ink), so the
        // glyph's crossing strokes never paint twice. Under the hand, the
        // address's.
        "-mx-[1.2cqw] flex items-center gap-[1.2cqw] px-[1.2cqw] py-[0.6cqw] font-mono text-(length:--card-head) text-foreground opacity-40 transition-[opacity,background-color] duration-150 [&_svg]:size-[1.15em] [&_svg]:stroke-[1.5]",
        "[&>span]:text-[0.72em] [&>span]:uppercase [&>span]:tracking-[0.18em]",
        "hover:bg-white/[0.06] hover:opacity-85 focus-visible:opacity-85 in-data-pressing:bg-white/[0.06] in-data-pressing:opacity-85",
      )}
    >
      <span>vCard</span>
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
