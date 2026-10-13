"use client";

import { SelectSocial } from "@/db/schema";
import { removeSocial } from "@/db/actions";
import ConfirmRemove from "@/components/confirm-remove";

export default function RemoveSocialButton({
  platformId,
}: {
  platformId: SelectSocial["id"];
}) {
  return (
    <ConfirmRemove
      onRemove={async () => {
        await removeSocial(platformId);
      }}
    />
  );
}
