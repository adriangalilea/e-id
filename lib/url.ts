import { PROD_URL } from "./const";

/**
 * Get the base URL for static/build-time contexts (layout, sitemap, etc.)
 * Auto-detects development vs production environment.
 *
 * @returns Base URL string (e.g., "http://localhost:3000" or "https://e-id.to")
 */
export function getBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  return process.env.URL || PROD_URL;
}

/**
 * Get the base URL from request headers for dynamic contexts.
 * Uses the actual host from the request to support all domain variants.
 *
 * @param headers - Next.js Headers object from headers()
 * @returns Base URL string based on the request host
 */
export function getBaseUrlFromHeaders(headers: Headers): string {
  const host = headers.get("host");

  if (!host) {
    return getBaseUrl();
  }

  if (host.startsWith("localhost")) {
    return `http://${host}`;
  }

  return `https://${host}`;
}
