import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { githubTag } from "@/lib/tags";

export type ContributionDay = { date: string; count: number; level: number };

type CalendarResponse = {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: { contributionCount: number; date: string }[];
          }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
};

const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { contributionCount date } }
      }
    }
  }
}`;

function levelOf(count: number) {
  if (count === 0) return 0;
  if (count > 10) return 3;
  if (count > 5) return 2;
  return 1;
}

/** A GitHub login's contribution calendar, the one read on a profile that GitHub
 *  owns: it changes daily whatever e-id does, so it is the one cache here on a
 *  timer, regenerated at most once a day per profile and only when the profile is
 *  visited. An empty calendar when GitHub cannot answer (no token on this
 *  machine, a login that does not exist, a rate limit): the profile still renders. */
export async function getContributions(
  login: string,
): Promise<ContributionDay[]> {
  "use cache";
  cacheLife("days");
  cacheTag(githubTag(login));

  const token = process.env.API_GITHUB_TOKEN;
  if (!token) {
    console.warn("API_GITHUB_TOKEN is not set: no GitHub calendar");
    return [];
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: QUERY, variables: { login: login.trim() } }),
  });
  if (!response.ok) {
    console.error(
      `GitHub calendar for ${login}: HTTP ${response.status} ${response.statusText}`,
    );
    return [];
  }

  const body: CalendarResponse = await response.json();
  if (body.errors?.length) {
    console.error(`GitHub calendar for ${login}:`, body.errors);
    return [];
  }
  const weeks =
    body.data?.user?.contributionsCollection.contributionCalendar.weeks;
  if (!weeks) return [];

  return weeks
    .flatMap((week) => week.contributionDays)
    .map(({ contributionCount, date }) => ({
      date: date.split("T")[0],
      count: contributionCount,
      level: levelOf(contributionCount),
    }));
}
