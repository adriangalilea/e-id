import { getUsers } from "@/db/actions";

const URL = "https://e-id.to";

export default async function sitemap() {
  const users = await getUsers();

  const routes = [""].map((route) => ({
    url: `${URL}${route}`,
    changeFrequency: "weekly",
    priority: 1,
  }));

  const base = [
    {
      url: `${URL}`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...base, ...routes];
}
