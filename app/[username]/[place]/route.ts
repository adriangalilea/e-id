import { getProfile, getPublicSocials, placeOf } from "@/lib/data";
import { platformNamed } from "@/lib/place-names";

// A PLACE STRAIGHT FROM AN ADDRESS: 👤.to/<username>/<place> opens that place
// (github, or gh; lib/place-names), their first public one of its kind. A
// redirect, never a page of ours. Temporary (307): a person changes their
// places, and a browser that kept the old one would send people to it.
// The card's own files (card.json, card.svg, card.vcf) and the edit page are
// named routes beside this one, and win over it.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; place: string }> },
) {
  const { username, place } = await params;
  const platform = platformNamed(place);
  if (!platform)
    return new Response(`no place is called ${place}`, { status: 404 });
  const profile = await getProfile(username);
  if (!profile)
    return new Response(`no e-ID is called ${username}`, { status: 404 });
  const social = (await getPublicSocials(profile.id)).find(
    (s) => s.platform === platform && s.value,
  );
  if (!social)
    return new Response(`${username} has no public ${platform}`, {
      status: 404,
    });
  return Response.redirect(placeOf(social).url, 307);
}
