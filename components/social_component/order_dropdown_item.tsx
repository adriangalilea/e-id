"use client";

import { SelectSocial } from "@/db/schema";
import { DropdownMenuItem } from "../ui/dropdown-menu";
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
      className="flex items-center justify-center gap-2"
      onClick={async () => {
        await orderSocial(socialId, number);
      }}
    >
      {number}
    </DropdownMenuItem>
  );
}
