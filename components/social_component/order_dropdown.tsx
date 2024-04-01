import { SelectSocial, SelectUser } from "@/db/schema";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getSocials } from "@/db/actions";
import OrderDropdownItem from "./order_dropdown_item";

export default async function OrderDropdown({
  userId,
  socialId,
}: {
  userId: SelectUser["id"];
  socialId: SelectSocial["id"];
}) {
  const socials = await getSocials(userId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="outline-none !ring-0 !ring-transparent"
      >
        <Button
          className="justify-center border-none bg-zinc-950/5 !shadow-none !ring-transparent
            transition-colors hover:border-none hover:bg-indigo-100 hover:bg-zinc-950/15
            dark:bg-zinc-50/5 hover:dark:bg-zinc-50/15"
          variant="ghost"
          size="icon"
        >
          {socials.find((social) => social.id === socialId)?.order || 1}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={0}
        className="!w-10 min-w-10"
      >
        {socials.map((social, index) => (
          <OrderDropdownItem
            key={social.id}
            socialId={socialId}
            number={index + 1}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
