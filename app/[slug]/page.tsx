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
import {
  Mail,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Globe,
  Link as LinkIcon,
  Hash,
  Send,
} from "lucide-react";
import { UserProfile1, orderedKeys1 } from "@/utils/model";

const keyToIconAndUrl: Record<
  string,
  { icon: JSX.Element; url: (value: string) => string }
> = {
  email: {
    icon: <Mail strokeWidth={1} className="size-12 text-indigo-500" />,
    url: (value: string) => `mailto:${value}`,
  },
  personalSite: {
    icon: <Globe strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => value,
  },
  telegramHandle: {
    icon: <Send strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => `https://t.me/${value}`,
  },
  twitterHandle: {
    icon: <Twitter strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => `https://twitter.com/${value}`,
  },
  instagramHandle: {
    icon: <Instagram strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => `https://instagram.com/${value}`,
  },
  facebookHandle: {
    icon: <Facebook strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => `https://facebook.com/${value}`,
  },
  linkedInHandle: {
    icon: <Linkedin strokeWidth={1} className="size-12 text-indigo-500"/>,
    url: (value: string) => `https://linkedin.com/in/${value}`,
  },
  other: {
    icon: <Hash className="size-12 text-indigo-500" />,
    url: (value: string) => value, // Assuming 'other' is an array of URLs or similar
  },
};

export default function Page({ params }: { params: { slug: string } }) {
  const [decodedData, setDecodedData] = useState<UserProfile1 | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data for slug:", params.slug);

        // Dynamically import the brotli-wasm module
        const brotli = await import("brotli-wasm").then((m) => m.default);

        // Decode the slug from Base64-URL to a Uint8Array
        const base64Decoded = atob(
          params.slug.replace(/-/g, "+").replace(/_/g, "/")
        );
        const compressedData = new Uint8Array(
          base64Decoded.split("").map((c) => c.charCodeAt(0))
        );

        // Decompress the data
        const decompressed = await brotli.decompress(compressedData);

        // Assuming the original data was a string, convert the Uint8Array back to a string
        const textDecoder = new TextDecoder();
        const originalData = textDecoder.decode(decompressed);

        const trimmedOriginalData = originalData.replace(/^"|"$/g, "");

        const dataArray = trimmedOriginalData.split(";");

        // Assuming dataArray is already populated with your data split by ";"
        if (dataArray.length > 0 && dataArray[0] === "1") {
          // Manually construct the UserProfile1 object from dataArray
          const dataObj: UserProfile1 = {
            version: "1", // Directly set, as we've verified the first element is "1"
            name: dataArray[1] || "", // Ensuring a string is assigned; adjust based on your requirements
            bio: dataArray[2] || undefined,
            personalSite: dataArray[3] || undefined,
            email: dataArray[4] || undefined,
            telegramHandle: dataArray[5] || undefined,
            twitterHandle: dataArray[6] || undefined,
            instagramHandle: dataArray[7] || undefined,
            facebookHandle: dataArray[8] || undefined,
            linkedInHandle: dataArray[9] || undefined,
            other: dataArray[10] || undefined,
          };
          console.log("Decoded Data:", dataObj);
          // Now you can safely call setDecodedData with dataObj
          setDecodedData(dataObj);
        } else {
          console.error("Invalid version number in decoded data");
          setDecodedData(null);
        }
      } catch (error) {
        console.error("Error decoding data:", error);
        setDecodedData(null);
      }
    };

    fetchData();
  }, [params.slug]);

  const renderDecodedData = (decodedData: UserProfile1) => {
    if (!decodedData) return <p>No valid data to display.</p>;

    document.title = `${decodedData.name}`;

    // Dynamically render social links and other fields with icons
    const renderLinksWithIcons = Object.entries(decodedData)
      .map(([key, value]) => {
        console.log("Rendering", key, "with value", value);
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
              className="size-14 rounded-full inline-flex backdrop-blur-sm bg-indigo-50/80 border-indigo-300/40 hover:bg-indigo-200/80 dark:bg-slate-950/80 dark:border-indigo-900/40 dark:hover:bg-indigo-950/80"
            >
              <Link href={url(value)}>{icon}</Link>
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
            <CardTitle className="!mb-8 text-balance flex items-center opacity-90">
              <span className="inline-block mr-4 text-[0.76em]">👤</span>
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
              className="size-12 w-full mx-4 border"
            >
              <Link
                href={decodedData.other}
                className="text-sm text-muted-foreground font-normal no-underline"
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
      <article className="mb-8 sm:mb-10 lg:mb-16 shadow-lg rounded-lg prose lg:prose-xl prose-zinc dark:prose-invert antialiased flex flex-col gap-8 w-fit">
        <Card className="bg-white/40 border border-indigo-200/80 dark:border-indigo-900/20 dark:hover:border-indigo-900/40 sm:dark:bg-slate-950/60 dark:bg-slate-950/40 backdrop-blur-sm transition-all ease-in-out duration-500">
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
