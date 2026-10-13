"use client";

import { SocialPlatform } from "@/db/schema";
import { DropdownMenuItem } from "@/components/ui/menu";
import { addSocial } from "@/db/actions";
import { getSocialIcon } from "@/lib/socials";

export default function AddSocialDropdownMenuItem({
  platform,
}: {
  platform: SocialPlatform;
}) {
  return (
    <DropdownMenuItem
      onClick={async () => {
        await addSocial(platform);
      }}
    >
      {getSocialIcon(platform)} <span>{platform}</span>
    </DropdownMenuItem>
  );
}
