import "server-only";

/** The person's photo, fetched at the card's size, as its bytes and type, or null.
 *  A photo that cannot be fetched or is of a kind not every reader reads (PNG,
 *  JPEG and GIF are) leaves the photo out, as a card with no photo has: a card
 *  made off the site (the share image, the contact) must not fail on their
 *  avatar host. `who` names the reader in the warning. */
export async function fetchPhoto(
  url: string | null,
  who: string,
): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!url) return null;
  const sized = /avatars\.githubusercontent\.com/.test(url)
    ? `${url}${url.includes("?") ? "&" : "?"}s=460`
    : url;
  const response = await fetch(sized);
  if (!response.ok) {
    console.warn(`${who}: ${url} answered ${response.status}`);
    return null;
  }
  const mime = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/png", "image/jpeg", "image/gif"].includes(mime)) {
    console.warn(
      `${who}: ${url} is ${mime || "of no stated type"}, which it cannot read`,
    );
    return null;
  }
  return { mime, bytes: new Uint8Array(await response.arrayBuffer()) };
}
