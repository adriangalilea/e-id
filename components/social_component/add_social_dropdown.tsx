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
        className="outline-none !ring-0 !ring-transparent"
      >
        <Button
          className="justify-center border-none bg-zinc-50/60 !shadow-none !ring-transparent
            hover:border-none hover:bg-indigo-100 hover:text-indigo-700 dark:bg-zinc-950/60
            dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
          variant="ghost"
        >
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="min-w-36">
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
