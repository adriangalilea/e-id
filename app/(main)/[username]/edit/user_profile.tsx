import { Input } from "@/components/ui/input";
import CountryPicker from "./country_picker";
import { SelectUser } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { SocialComponent } from "@/components/social_component";

export default function UserProfile({ user }: { user: SelectUser }) {
  const updateUserWithUser = updateUser.bind(null, user.id);

  return (
    <form action={updateUserWithUser}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col justify-between gap-1 sm:grow sm:flex-row sm:items-end">
          <Input
            type="text"
            name="name"
            defaultValue={user.name!}
            className="!m-0 rounded-none text-2xl font-normal focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="Name"
          />
          <div className="flex items-center gap-1 font-extralight">
            @
            <Input
              type="text"
              name="username"
              defaultValue={user.username!}
              className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
              placeholder="handle"
            />
          </div>
          <div className="flex content-between items-start gap-1">
            <input
              type="hidden"
              name="country_code"
              defaultValue={user.country_code}
            />
            <CountryPicker savedCountry={user.country_code} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="mt-4 border-l border-zinc-500">
          <Input
            type="text"
            name="bio"
            defaultValue={user.bio!}
            className="prose prose-zinc dark:prose-invert !m-0 mb-2 rounded-none bg-black/5 p-2 text-[16px] italic focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:bg-white/5"
          />
        </div>
        {/* <SocialComponent user={user} /> */}
        <div className="flex items-center gap-1 mt-2">
          <Twitter size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="twitter"
            defaultValue={"@adrigalilea"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="handle"
          />
        </div>
        <div className="flex items-center gap-1">
          <LinkIcon size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="website"
            defaultValue={"https://adriangalilea.com"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="website url"
          />
        </div>
        <div className="flex items-center gap-1">
          <Mail size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="email"
            defaultValue={user.email!}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="email"
          />
        </div>
        <div className="flex items-center gap-1">
          <Github size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="github"
            defaultValue={"adrigalilea"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="handle"
          />
        </div>
        <div className="flex items-center gap-1">
          <Youtube size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="youtube"
            defaultValue={"adrigalilea"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="handle"
          />
        </div>
        <div className="flex items-center gap-1">
          <Instagram size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="instagram"
            defaultValue={"adrigalilea"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="handle"
          />
        </div>
        <div className="flex items-center gap-1">
          <Facebook size={18} strokeWidth={1} className="opacity-80" />
          <Input
            type="text"
            name="facebook"
            defaultValue={"adrigalilea"}
            className="!m-0 min-w-[160px] grow rounded-none text-[16px] focus-visible:border-zinc-500 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal"
            placeholder="handle"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="z-10 !h-10 !w-10 shrink-0 grow-0 rounded-none bg-zinc-500/20 !p-0"
        variant="ghost"
      >
        <SendHorizontal strokeWidth={1} />
      </Button>
    </form>
  );
}
