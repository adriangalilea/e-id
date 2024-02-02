"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

  // Function to render decoded data fields, omitting the 'version' field
  const renderDecodedData = () => {
    if (!decodedData) return <p>No valid data to display.</p>;

    return Object.entries(decodedData)
      .filter(([key, value]) => value && key !== "version") // Filter out empty values and the 'version' key
      .map(([key, value]) => {
        // Check if the value is an array and convert it to a string for display
        const displayValue = Array.isArray(value) ? value.join(", ") : value;
        return key === "name" ? (
          <h1 key={key}>👤 {displayValue}</h1>
        ) : (
          <p key={key}>
            <strong>{key}:</strong> {displayValue}
          </p>
        );
      });
  };

  return (
    <div className="min-h-screen w-screen flex flex-col">
      <main className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden">
        <article className="shadow rounded-lg p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8 prose lg:prose-xl prose-zinc dark:prose-invert antialiased">
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
