"use client";
import { useState, useEffect } from "react";

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
        return (
          <p key={key}>
            <strong>{key}:</strong> {displayValue}
          </p>
        );
      });
  };

  return (
    <div>
      <h1>e-id to</h1>
      {decodedData ? renderDecodedData() : <p>Loading...</p>}
    </div>
  );
}
