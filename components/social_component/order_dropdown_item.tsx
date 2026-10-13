"use client";

import { SelectSocial } from "@/db/schema";
import { DropdownMenuItem } from "@/components/ui/menu";
import { orderSocial } from "@/db/actions";

export default function OrderDropdownItem({
  socialId,
  number,
}: {
  socialId: SelectSocial["id"];
  number: SelectSocial["order"];
}) {
  return (
    <DropdownMenuItem
      className="justify-center"
      onClick={async () => {
        await orderSocial(socialId, number);
      }}
    >
      {number}
    </DropdownMenuItem>
  );
}
