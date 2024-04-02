"use client";
import { Input } from "@/components/ui/input";
import CountryPicker from "./country_picker";
import { SelectUser } from "@/db/schema";
import { updateUserAndSocials } from "@/db/actions";
import { InputQuote } from "@/components/quote";
import { Label } from "@/components/ui/label";
import { SaveButton } from "./save_button";
import { AtSign, Ban } from "lucide-react";
import { useFormState } from "react-dom";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const initialState = {
  message: "",
  error: false,
};

export default function UserProfile({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SelectUser;
}) {
  const [state, formAction] = useFormState(updateUserAndSocials, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-1 flex-col mb-6 gap-6 sm:border sm:border-zinc-500/40 sm:bg-zinc-500/5
        sm:p-3"
    >
      <div className="flex flex-col">
        <div className="flex w-full items-center gap-3">
          <div className="flex flex-col justify-between gap-3 sm:grow sm:flex-row sm:items-end">
            <Input
              data-1p-ignore
              type="text"
              name="name"
              defaultValue={user.name!}
              className="!m-0 !bg-transparent text-2xl font-normal focus-visible:border-zinc-500
                focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0
                sm:font-normal"
              placeholder="Name"
            />
            <div className="flex items-center font-extralight">
              <Label
                htmlFor="username"
                className={cn(
                  "flex size-10 items-center justify-center bg-zinc-50/10",
                  state?.error && "bg-destructive",
                )}
              >
                <AtSign strokeWidth={1} size="20" />
              </Label>
              <Input
                data-1p-ignore
                type="text"
                id="username"
                name="username"
                defaultValue={user.username!}
                className={cn(
                  `!m-0 min-w-[140px] grow border border-border !bg-transparent text-[16px]
                  focus-visible:border-zinc-500 focus-visible:ring-0
                  focus-visible:ring-transparent focus-visible:ring-offset-0 sm:font-normal`,
                  state?.error &&
                    "border-destructive focus-visible:border-destructive/50",
                )}
                placeholder="username"
              />
            </div>
            <div className="flex content-between items-start gap-1.5">
              <input
                type="hidden"
                name="country_code"
                defaultValue={user.country_code}
              />
              <CountryPicker savedCountry={user.country_code} />
            </div>
          </div>
        </div>
        {state.message && (
          <Alert
            variant={state?.error ? "destructive" : "default"}
            className="mt-6"
          >
            <Ban className="size-4" />
            <AlertTitle>{state?.message}</AlertTitle>
          </Alert>
        )}
        <div className="mt-6 flex w-full flex-col gap-6">
          <InputQuote
            text={user.bio ?? ""}
            name="bio"
            placeholder="Message to the world"
          />
          {children}
        </div>
      </div>
      <SaveButton />
    </form>
  );
}
