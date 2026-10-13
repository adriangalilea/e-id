"use client";

import { SocialPlatform } from "@/db/schema";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { addSocial } from "@/db/actions";
import { getSocialIcon } from "@/lib/socials";

export default function AddSocialDropdownMenuItem({
  platform,
}: {
  platform: SocialPlatform;
}) {
  return (
    <DropdownMenuItem
      className="flex gap-2 focus:bg-indigo-50 dark:focus:bg-indigo-950"
      onClick={async () => {
        await addSocial(platform);
      }}
    >
      {getSocialIcon(platform)} <span>{platform}</span>
    </DropdownMenuItem>
  );
}
