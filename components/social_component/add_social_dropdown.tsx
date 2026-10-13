import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { socialPlatforms } from "@/db/schema";
import AddSocialDropdownMenuItem from "./add_social_dropdown_item";

export default function AddSocialDropdownMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="outline-hidden ring-0! ring-transparent!"
      >
        <Button
          className="h-full w-full text-foreground/60 hover:text-foreground"
          variant="ghost"
          size="lg"
          aria-label="add a social"
        >
          <Plus strokeWidth={1} className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="min-w-36">
        {socialPlatforms.map((platform) => (
          <AddSocialDropdownMenuItem key={platform} platform={platform} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
