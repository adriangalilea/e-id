import { cacheLife } from "next/cache";
import { cardOf } from "@/lib/card";
import { getUsernames } from "@/lib/data";
import { vcardOf } from "@/lib/vcard";

// A person's card as a contact (lib/vcard), for a phone to add in one tap. Also
// answers /<username>.vcf and a profile asked for `text/vcard` (next.config,
// `rewrites`). Open to every origin, as card.json is. Prerendered for every
// handle at build, as the profiles are.

const CORS = { "access-control-allow-origin": "*" };

export async function generateStaticParams() {
  return (await getUsernames()).map((username) => ({ username }));
}

async function contact(username: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const card = await cardOf(username);
  return card ? vcardOf(card) : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const vcard = await contact(username);
  if (!vcard)
    return new Response(`no e-ID is called ${username}`, {
      status: 404,
      headers: CORS,
    });
  return new Response(vcard, {
    headers: {
      ...CORS,
      "content-type": "text/vcard; charset=utf-8",
      // Saved as a file named for them; a phone opens it as a new contact.
      "content-disposition": `attachment; filename="${username}.vcf"`,
    },
  });
}
