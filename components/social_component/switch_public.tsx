"use client";

import { Switch } from "@/components/ui/switch";
import { Tip } from "@/components/ui/tooltip";

/** Whether a place shows on the profile, a field of the edit form (@ag/switch):
 *  checked it is sent under its name, unchecked it is not, which the form reads
 *  as private (db/actions, `socialsOf`). */
export function SwitchPublic({
  id,
  name,
  defaultChecked,
}: {
  id: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <Tip content="public">
      <Switch
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        aria-label="public"
      />
    </Tip>
  );
}
