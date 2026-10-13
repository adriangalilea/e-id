import { notFound, redirect } from "next/navigation";
import { getAllSocials, getProfile } from "@/lib/data";
import { getPresence } from "@/lib/presence";
import { getSession } from "@/lib/session";
import { Wide } from "@/components/frame";
import UserProfile from "../user_profile";

// The one profile page that reads the session: only its owner edits it.
export default async function EditPage(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;
  const session = await getSession();
  const user = await getProfile(username);
  if (!user) notFound();
  if (session?.user.id !== user.id) redirect(`/${user.username}`);

  const socials = await getAllSocials(user.id);
  const presence = await getPresence(socials);

  return (
    <Wide>
      <UserProfile user={user} socials={socials} presence={presence} edit />
    </Wide>
  );
}
