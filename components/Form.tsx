"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { userProfileSchema1, UserProfile1 } from "../utils/model";
import { encodeData } from "../utils/dataTransform";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function UserProfileForm() {
  const form = useForm<UserProfile1>({
    resolver: zodResolver(userProfileSchema1),
    defaultValues: {
      version: "1",
      name: "",
      bio: "",
      personalSite: "",
      email: "",
      telegramLink: "",
      twitterHandle: "",
      instagramHandle: "",
      facebookHandle: "",
      linkedInHandle: "",
      other: [],
    },
  });

  async function onSubmit(values: UserProfile1) {
    try {
      const encoded = await encodeData(values);
      // console.log("Encoded Data:", encoded);
      // redirect to the generated path
      window.location.href = `/${encoded}`;
    } catch (error) {
      console.error("Error encoding data:", error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Adrian Galilea" {...field} />
              </FormControl>
              <FormDescription>
                This is your displayed full name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Input placeholder="Teito and Lulx are cool." {...field} />
              </FormControl>
              <FormDescription>
                This is your public bio. Markdown is supported.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="personalSite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Site</FormLabel>
              <FormControl>
                <Input placeholder="https://adriangalilea.com" {...field} />
              </FormControl>
              <FormDescription>
                This is your personal website. It will be displayed on your
                profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@doe.to" {...field} />
              </FormControl>
              <FormDescription>
                This is your public email. It will be displayed on your profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telegramLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telegram</FormLabel>
              <FormControl>
                <Input placeholder="https://t.me/adriangalilea" {...field} />
              </FormControl>
              <FormDescription>
                This is your public Telegram link. It will be displayed on your
                profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="twitterHandle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Twitter</FormLabel>
              <FormControl>
                <Input placeholder="@adrigalilea" {...field} />
              </FormControl>
              <FormDescription>
                This is your public Twitter handle. It will be displayed on your
                profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="instagramHandle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instagram</FormLabel>
              <FormControl>
                <Input placeholder="@instagram_sucks" {...field} />
              </FormControl>
              <FormDescription>
                This is your public Instagram handle. It will be displayed on
                your profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="other"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>
                This is your public Other link. It will be displayed on your
                profile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
