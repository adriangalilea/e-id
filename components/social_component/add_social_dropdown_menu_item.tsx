"use client";

import { SelectUser, SocialPlatform } from "@/db/schema";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { addSocial } from "@/db/actions";
import { getSocialIcon } from "@/lib/socials";

export default function AddSocialDropdownMenuItem({
  userId,
  platform,
}: {
  userId: SelectUser["id"];
  platform: SocialPlatform;
}) {
  return (
    <DropdownMenuItem
      className="flex gap-2"
      onClick={async () => {
        await addSocial(userId, platform);
      }}
    >
      {getSocialIcon(platform)} <span className="opacity-80">{platform}</span>
    </DropdownMenuItem>
  );
}
