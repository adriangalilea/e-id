import Flag from "@/components/flag";
import { Separator } from "@/components/ui/separator";
import { SelectUser } from "@/db/schema";
import { Github, Home, MapPin, Twitter } from "lucide-react";
import { SocialComponent } from "./social_component";

export default async function UserProfile({ user }: { user: SelectUser }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <p>👤 {user.name}</p>
          <p className="font-extralight opacity-70">@{user.username}</p>
        </div>
        <div className="flex gap-0.5 items-center">
          <MapPin size={18} strokeWidth={1} className="opacity-80" />
          <Flag country={user.country_code} />
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 p-2 ">
        <p className="prose prose-zinc dark:prose-invert antialiased">
          {user.bio}
        </p>
        <SocialComponent network="twitter" identifier="adriangalilea" />
      </div>
    </div>
  );
}
