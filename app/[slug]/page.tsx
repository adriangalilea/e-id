"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { UserProfile1 } from "@/utils/model";

const keyToIconAndUrl: Record<
  string,
  { icon: JSX.Element; url: (value: string) => string }
> = {
  email: {
    icon: <Mail className="size-4" />,
    url: (value: string) => `mailto:${value}`,
  },
  personalSite: {
    icon: <Globe className="size-4" />,
    url: (value: string) => value,
  },
  telegramLink: {
    icon: <Send className="size-4" />,
    url: (value: string) => `https://t.me/${value}`,
  },
  twitterHandle: {
    icon: <Twitter className="size-4" />,
    url: (value: string) => `https://twitter.com/${value}`,
  },
  instagramHandle: {
    icon: <Instagram className="size-4" />,
    url: (value: string) => `https://instagram.com/${value}`,
  },
  facebookHandle: {
    icon: <Facebook className="size-4" />,
    url: (value: string) => `https://facebook.com/${value}`,
  },
  linkedInHandle: {
    icon: <Linkedin className="size-4" />,
    url: (value: string) => `https://linkedin.com/in/${value}`,
  },
  other: {
    icon: <Hash className="mr-2 h-4 w-4" />,
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

        console.log("Decoded data:", originalData);
        // Parse the JSON string to an object
        const dataObj = JSON.parse(originalData);
        setDecodedData(dataObj);
      } catch (error) {
        console.error("Error decoding data:", error);
        setDecodedData(null);
      }
    };

    fetchData();
  }, [params.slug]);

  const renderDecodedData = (decodedData: UserProfile1) => {
    if (!decodedData) return <p>No valid data to display.</p>;

    // Dynamically render social links and other fields with icons
    const renderLinksWithIcons = Object.entries(decodedData)
      .map(([key, value]) => {
        if (value && key !== "version" && keyToIconAndUrl[key]) {
          const { icon, url } = keyToIconAndUrl[key];
          if (key === "other" && value !== "") {
            // For "other", render the button to display as a block (own line)
            return (
              <div className="w-full">
                {" "}
                {/* Wrap in a div with w-full to ensure it takes up its own line */}
                <Button
                  key={key}
                  asChild
                  variant="outline"
                  className="size-12 w-full block flex mt-8" // Add `block` to ensure it displays as a block-level element
                >
                  <Link href={url(value)}>{value}</Link>
                </Button>
              </div>
            );
          }
          // For all other keys, render as inline buttons
          return (
            <Button
              key={key}
              asChild
              variant="secondary"
              className="size-12 rounded-full inline-flex"
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
        {decodedData.name && (
          <h1 className="text-2xl font-semibold !mb-0">
            👤{" "}
            {decodedData.name.charAt(0).toUpperCase() +
              decodedData.name.slice(1)}
          </h1>
        )}
        {decodedData.bio && <p className="!m-0">{decodedData.bio}</p>}
        <div className="flex flex-wrap gap-2 justify-between w-full">
          {renderLinksWithIcons}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen w-screen">
      <main className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden">
        <article className="shadow rounded-lg p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 prose lg:prose-xl prose-zinc dark:prose-invert antialiased flex flex-col gap-8 w-fit">
          {decodedData ? renderDecodedData(decodedData) : <p>Loading...</p>}
        </article>
      </main>
      <footer className="w-full prose lg:prose-xl prose-zinc dark:prose-invert p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 fixed bottom-0">
        <Button asChild variant="link">
          <Link className="lg:no-underline" href="/">
            👤 Get your e-id
          </Link>
        </Button>
      </footer>
    </div>
  );
}
