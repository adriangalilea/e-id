import { SelectSocial } from "@/db/schema";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import OrderDropdownItem from "./order_dropdown_item";

/** A social's place among its owner's socials, and the places it can move to. */
export default function OrderDropdown({
  socialId,
  position,
  count,
}: {
  socialId: SelectSocial["id"];
  position: number;
  count: number;
}) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              asChild
              className="ring-0! ring-transparent! bg-transparent"
            >
              <Button
                className="justify-center border border-border transition-colors hover:bg-zinc-950/15
                  dark:hover:bg-zinc-50/15"
                variant="outline"
                size="icon-lg"
              >
                {position}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>priority</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="end"
        sideOffset={0}
        className="w-10! min-w-10"
      >
        {Array.from({ length: count }, (_, index) => (
          <OrderDropdownItem
            key={index}
            socialId={socialId}
            number={index + 1}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
