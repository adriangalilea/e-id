type GithubOutput = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: {
              contributionCount: number;
              date: string;
            }[];
          }[];
        };
      };
    };
  };
};

export const flattenData = (
  data: GithubOutput,
): {
  date: string;
  count: number;
  level: number;
}[] => {
  return data.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .map(({ contributionCount, date }) => {
      let level;
      if (contributionCount === 0) {
        level = 0;
      } else if (contributionCount > 10) {
        level = 3;
      } else if (contributionCount > 5) {
        level = 2;
      } else {
        level = 1;
      }

      return {
        date: date.split("T")[0],
        count: contributionCount,
        level: level,
      };
    });
};

// TODO: handle rate limits
// https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#primary-rate-limit
// consider non personal access token from the app

export async function fetchGithubActivity(username: string) {
  return fetch(`https://api.github.com/graphql`, {
    next: { revalidate: 60 * 60 * 24 },
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.API_GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
      query {
        user(login: "${username}") {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `,
    }),
  }).then((res) => res.json());
}
