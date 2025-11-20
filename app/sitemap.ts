import { getUsers } from "@/db/actions";
import { getBaseUrl } from "@/lib/url";

export default async function sitemap() {
  const users = await getUsers();
  const baseUrl = getBaseUrl();

  const routes = users.map((user) => ({
    url: `${baseUrl}/${user.username}`,
    changeFrequency: "weekly",
    priority: 1,
  }));

  const base = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...base, ...routes];
}
