"use client";

import { ContactRound } from "lucide-react";
import { ON_CARD } from "@/components/card-shape";
import { Button, type ButtonSize } from "@/components/ui/button";
import { cn } from "@/lib/utils";
/** The card's own save (`IdCard`'s `save`), in its foot's corner, mirroring the
 *  country at its head: `vCard` and the contact glyph in the head's type,
 *  engraved in the card at rest (a dark lip above, a faint light floor below,
 *  as the profile's quotes are set into the page) and a step quieter than the
 *  address. Under the hand it is the address's own (`CopyAddress`): the same
 *  pill, padding and brightening. Dimmed as one shape (`opacity` over an opaque
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
        // Engraved: cut into the card, so darker than its surface and opaque
        // (nothing of the print shows through the cut), its lower edge
        // catching the light as a hairline. Under the hand, the address's.
        "-mx-[1.2cqw] flex items-center gap-[1.2cqw] px-[1.2cqw] py-[0.6cqw] font-mono text-(length:--card-head) text-[#050506] transition-[color,background-color] duration-150 [text-shadow:0_1px_0_rgb(255_255_255/0.16)] [&_svg]:size-[1.15em] [&_svg]:stroke-[1.5] [&_svg]:drop-shadow-[0_1px_0_rgb(255_255_255/0.16)]",
        "hover:bg-white/[0.06] hover:text-[#d9d9d9] hover:[text-shadow:none] hover:[&_svg]:drop-shadow-none focus-visible:text-[#d9d9d9] in-data-pressing:bg-white/[0.06] in-data-pressing:text-[#d9d9d9]",
      )}
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
