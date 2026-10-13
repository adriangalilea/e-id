import { SelectSocial } from "@/db/schema";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Tip } from "@/components/ui/tooltip";
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
      <Tip content="priority">
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={`priority ${position}`}
            />
          }
        >
          {position}
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" sideOffset={0} className="min-w-10">
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
