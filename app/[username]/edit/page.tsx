import { notFound, redirect } from "next/navigation";
import { getAllSocials, getProfile } from "@/lib/data";
import { getContributions } from "@/lib/github";
import { getSession } from "@/lib/session";
import { Column } from "@/components/frame";
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
  const github = socials.find(
    (social) => social.platform === "github" && social.value,
  );
  const githubData = github?.value ? await getContributions(github.value) : [];

  return (
    <Column>
      <UserProfile
        user={user}
        socials={socials}
        githubData={githubData}
        edit={true}
      />
    </Column>
  );
}
