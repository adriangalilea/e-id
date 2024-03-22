"use client";
import brotliPromise from "brotli-wasm";
import { UserProfile1, orderedKeys1, userProfileSchema1 } from "./model";

export const encodeData = async (formData: UserProfile1): Promise<string> => {
  const brotli = await brotliPromise;
  const textEncoder = new TextEncoder();

  const dataArray = orderedKeys1.map((key) =>
    formData[key] === undefined ? "" : formData[key],
  );

  console.log(dataArray);

  const joinedData = dataArray.join(";");

  console.log(joinedData);

  const uncompressedData = textEncoder.encode(JSON.stringify(joinedData));
  const compressed = await brotli.compress(uncompressedData);
  const base64Encoded = btoa(
    String.fromCharCode(...new Uint8Array(compressed)),
  );
  return base64Encoded
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const decodeData = async (
  encodedData: string,
): Promise<UserProfile1> => {
  const brotli = await brotliPromise;
  const textDecoder = new TextDecoder();
  const base64Decoded = atob(encodedData.replace(/-/g, "+").replace(/_/g, "/"));
  const decompressed = await brotli.decompress(
    new Uint8Array(base64Decoded.split("").map((c) => c.charCodeAt(0))),
  );

  const decompressedString = textDecoder.decode(decompressed);
  const trimmedOriginalData = decompressedString.replace(/^"|"$/g, "");
  const dataArray = trimmedOriginalData.split(";");

  // Initialize a container for the parsed fields
  let parsedData: { [key: string]: any } = {};

  orderedKeys1.forEach((key, index) => {
    const value = dataArray[index];
    // Directly assigning values; consider parsing or transforming if necessary
    parsedData[key] = value;
  });

  // Use zod to parse and validate the data against userProfileSchema1
  const result = userProfileSchema1.safeParse(parsedData);

  if (!result.success) {
    // Handle validation errors, e.g., throw an error or return a default object
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  return result.data;
};
