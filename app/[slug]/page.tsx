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

const keyToIconAndUrl = {
  email: {
    icon: <Mail className="size-4" />,
    url: (value) => `mailto:${value}`,
  },
  personalSite: {
    icon: <Globe className="size-4" />,
    url: (value) => value,
  },
  telegramLink: {
    icon: <Send className="size-4" />,
    url: (value) => `https://t.me/${value}`,
  },
  twitterHandle: {
    icon: <Twitter className="size-4" />,
    url: (value) => `https://twitter.com/${value}`,
  },
  instagramHandle: {
    icon: <Instagram className="size-4" />,
    url: (value) => `https://instagram.com/${value}`,
  },
  facebookHandle: {
    icon: <Facebook className="size-4" />,
    url: (value) => `https://facebook.com/${value}`,
  },
  linkedInHandle: {
    icon: <Linkedin className="size-4" />,
    url: (value) => `https://linkedin.com/in/${value}`,
  },
  other: {
    icon: <Hash className="mr-2 h-4 w-4" />,
    url: (value) => value, // Assuming 'other' is an array of URLs or similar
  },
};

export default function Page({ params }: { params: { slug: string } }) {
  const [decodedData, setDecodedData] = useState<null | Record<string, any>>(
    null
  );

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

  const renderDecodedData = () => {
    if (!decodedData) return <p>No valid data to display.</p>;

    const categories = {
      beforeBio: [],
      bio: null,
      betweenBioAndOtherElements: [], // Store JSX elements directly
      other: null,
    };

    let foundBio = false;

    Object.entries(decodedData)
      .filter(([key, value]) => value && key !== "version") // Exclude 'version' and empty values
      .forEach(([key, value]) => {
        if (key === "name") {
          categories.name = (
            <h1 key={key} className="text-2xl font-semibold !mb-0">
              👤 {value.charAt(0).toUpperCase() + value.slice(1)}
            </h1>
          );
        } else if (key === "bio") {
          foundBio = true;
          categories.bio = (
            <p key={key} className="!m-0">
              {value}
            </p>
          );
        } else if (key === "other") {
          // Ensure 'value' is a string and not empty or just whitespace
          if (typeof value === "string" && value.trim()) {
            categories.other = (
              <Button
                key="other"
                asChild
                variant="outline"
                className="px-4 py-2 border rounded"
              >
                <Link href="#">
                  <span>{value}</span>
                </Link>
              </Button>
            );
          }
        } else {
          const items = (Array.isArray(value) ? value : [value]).map(
            (item, index) => {
              const { icon, url } = keyToIconAndUrl[key] || {};
              const itemUrl = url ? url(item) : "#";
              return (
                <Button
                  key={`${key}-${index}`}
                  asChild
                  variant="outline"
                  className="px-4 py-2 size-12 rounded-full inline-flex items-center justify-center"
                >
                  <Link href={itemUrl}>{icon}</Link>
                </Button>
              );
            }
          );

          if (foundBio) {
            categories.betweenBioAndOtherElements.push(...items);
          } else {
            categories.beforeBio.push(...items);
          }
        }
      });

    const betweenBioAndOther =
      categories.betweenBioAndOtherElements.length > 0 ? (
        <div className="flex space-x-2 justify-around w-full">
          {categories.betweenBioAndOtherElements}
        </div>
      ) : null;

    return (
      <>
        {categories.name}
        {categories.beforeBio}
        {categories.bio}
        {betweenBioAndOther}
        {categories.other ? categories.other : null}
      </>
    );
  };

  return (
    <div className="min-h-screen w-screen">
      <main className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden">
        <article className="shadow rounded-lg p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 prose lg:prose-xl prose-zinc dark:prose-invert antialiased flex flex-col gap-8">
          {decodedData ? renderDecodedData() : <p>Loading...</p>}
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
