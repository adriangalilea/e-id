"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { keyToIconAndUrl } from "@/app/(ninja)/ninja/codec/buttons";
import { UserProfile1 } from "@/app/(ninja)/ninja/codec/model";
import { decodeData } from "@/app/(ninja)/ninja/codec/codec";

export default function EID({ slug }: { slug: string }) {
  const [decodedData, setDecodedData] = useState<UserProfile1 | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("Fetching data for slug:", slug);
        const data = await decodeData(slug);
        console.log("Decoded Data:", data);
        setDecodedData(data); // Update state with the decoded data
      } catch (error) {
        console.error("Error decoding data:", error);
        setDecodedData(null); // Handle error by resetting the state
      }
    })();
  }, [slug]);

  const renderDecodedData = (decodedData: UserProfile1) => {
    if (!decodedData) return <p>No valid data to display.</p>;

    document.title = `${decodedData.name}`;

    // Dynamically render social links and other fields with icons
    const renderLinksWithIcons = Object.entries(decodedData)
      .map(([key, value]) => {
        if (
          value &&
          key !== "version" &&
          key !== "other" &&
          keyToIconAndUrl[key]
        ) {
          const { icon, url } = keyToIconAndUrl[key];
          // For all other keys, render as inline buttons
          return (
            <Button
              key={key}
              asChild
              variant="outline"
              className="inline-flex size-14 rounded-full border-indigo-300/40 bg-indigo-50/80 backdrop-blur-sm transition-all duration-500 ease-in-out hover:bg-indigo-200/80 dark:border-indigo-900/30 dark:bg-slate-700/80 dark:hover:bg-indigo-800/50"
            >
              <Link
                href={url(value)}
                className="size-12 text-indigo-500 transition-all 
duration-500 ease-in-out hover:text-indigo-400"
              >
                {icon}
              </Link>
            </Button>
          );
        }
        return null;
      })
      .filter(Boolean); // Filter out null values

    return (
      <>
        <CardHeader>
          {decodedData.name && (
            <CardTitle className="!mb-8 flex items-center text-balance opacity-90">
              <span className="mr-4 inline-block text-[0.76em]">👤</span>
              {decodedData.name.charAt(0).toUpperCase() +
                decodedData.name.slice(1)}
            </CardTitle>
          )}
          {decodedData.bio && (
            <CardDescription>{decodedData.bio}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex justify-center gap-4">
          {renderLinksWithIcons}
        </CardContent>
        {decodedData.other && (
          <CardFooter className="pt-2">
            <Button
              asChild
              variant="outline"
              className="mx-4 size-12 w-full border"
            >
              <Link
                href={decodedData.other}
                className="text-sm font-normal text-muted-foreground no-underline"
              >
                {decodedData.other}
              </Link>
            </Button>
          </CardFooter>
        )}
      </>
    );
  };

  return (
    <main>
      <article className="prose prose-zinc mb-8 flex w-fit flex-col gap-8 rounded-lg antialiased shadow-lg lg:prose-xl dark:prose-invert sm:mb-10 lg:mb-16">
        <Card className="border border-indigo-200/80 bg-white/40 backdrop-blur-sm transition-all duration-500 ease-in-out dark:border-indigo-900/20 dark:bg-slate-700/60 dark:hover:border-indigo-900/40 sm:dark:bg-slate-700/60">
          {decodedData ? (
            renderDecodedData(decodedData)
          ) : (
            <p className="p-12">Loading...</p>
          )}
        </Card>
      </article>
    </main>
  );
}
