"use client";
import brotliPromise from "brotli-wasm";

export const encodeData = async (formData: object): Promise<string> => {
  const brotli = await brotliPromise;
  const textEncoder = new TextEncoder();
  const uncompressedData = textEncoder.encode(JSON.stringify(formData));
  const compressed = await brotli.compress(uncompressedData);
  const base64Encoded = btoa(
    String.fromCharCode(...new Uint8Array(compressed))
  );
  return base64Encoded
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const decodeData = async (encodedData: string): Promise<object> => {
  const brotli = await brotliPromise;
  const textDecoder = new TextDecoder();
  const base64Decoded = atob(encodedData.replace(/-/g, "+").replace(/_/g, "/"));
  const decompressed = await brotli.decompress(
    new Uint8Array(base64Decoded.split("").map((c) => c.charCodeAt(0)))
  );
  return JSON.parse(textDecoder.decode(decompressed));
};
