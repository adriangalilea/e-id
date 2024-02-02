"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { userProfileSchema1, UserProfile1 } from "../utils/model";
import { encodeData } from "../utils/dataTransform";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { Textarea } from "./ui/textarea";

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
      other: "",
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
    <Card>
      <CardHeader>
        <CardTitle>👤 e-id</CardTitle>
        <CardDescription>Digital identity.</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 prose lg:prose-xl xl:prose-2xl prose-zinc dark:prose-invert antialiased"
        >
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Adrian Galilea" {...field} />
                  </FormControl>
                  <FormDescription className="sr-only">
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
                    <Textarea
                      placeholder="Tell us a little bit about yourself"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
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
                  <FormDescription className="sr-only">
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
                  <FormDescription className="sr-only">
                    This is your public email. It will be displayed on your
                    profile.
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
                    <Input
                      placeholder="https://t.me/adriangalilea"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="sr-only">
                    This is your public Telegram link. It will be displayed on
                    your profile.
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
                  <FormDescription className="sr-only">
                    This is your public Twitter handle. It will be displayed on
                    your profile.
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
                  <FormDescription className="sr-only">
                    This is your public Instagram handle. It will be displayed
                    on your profile.
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
                  <FormDescription className="sr-only">
                    This is your public Other link. It will be displayed on your
                    profile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Generate
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
