"use client";

import { SelectComment } from "@/db/schema";
import { deleteComment } from "@/db/actions";
import ConfirmRemove from "@/components/confirm-remove";

export default function RemoveComment({
  commentId,
  onChange,
}: {
  commentId: SelectComment["id"];
  onChange: () => void;
}) {
  return (
    <ConfirmRemove
      side="left"
      onRemove={async () => {
        await deleteComment(commentId);
        onChange();
      }}
    />
  );
}
