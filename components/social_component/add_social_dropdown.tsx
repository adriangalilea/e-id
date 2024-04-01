import { SelectUser, SocialPlatform } from "@/db/schema";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { socialPlatforms } from "@/db/schema";
import AddSocialDropdownMenuItem from "./add_social_dropdown_item";

export default function AddSocialDropdownMenu({
  userId,
}: {
  userId: SelectUser["id"];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="focus-visible:outline-none focus-visible:!ring-0 focus-visible:!ring-transparent"
      >
        <Button
          className="justify-center border-none text-indigo-500 !shadow-none hover:border-none
            hover:bg-indigo-500/10 hover:text-indigo-500 focus-visible:!ring-transparent"
          variant="ghost"
        >
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="min-w-36">
        <DropdownMenuLabel className="text-indigo-500">
          Add Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {socialPlatforms.map((platform) => (
          <AddSocialDropdownMenuItem
            key={platform}
            userId={userId}
            platform={platform}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
