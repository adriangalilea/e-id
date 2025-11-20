type GithubOutput = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: {
            contributionDays?: {
              contributionCount: number;
              date: string;
            }[];
          }[];
        };
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

// Type guard to validate GitHub API response structure
function isValidGithubResponse(data: unknown): data is GithubOutput {
  if (!data || typeof data !== "object") return false;
  const response = data as GithubOutput;

  // Check for GraphQL errors
  if (response.errors && response.errors.length > 0) {
    console.error("GitHub API returned errors:", response.errors);
    return false;
  }

  // Validate data structure exists
  return !!response.data?.user?.contributionsCollection?.contributionCalendar
    ?.weeks;
}

export const flattenData = (
  data: GithubOutput,
): {
  date: string;
  count: number;
  level: number;
}[] => {
  // Validate data structure before processing
  if (!isValidGithubResponse(data)) {
    console.warn("Invalid GitHub API response structure");
    return [];
  }

  try {
    const weeks =
      data.data?.user?.contributionsCollection?.contributionCalendar?.weeks;

    if (!weeks || !Array.isArray(weeks)) {
      return [];
    }

    return weeks
      .flatMap((week) => week.contributionDays ?? [])
      .filter((day) => day !== null && day !== undefined)
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
  } catch (error) {
    console.error("Error flattening GitHub data:", error);
    return [];
  }
};

// TODO: handle rate limits
// https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api#primary-rate-limit
// consider non personal access token from the app

export async function fetchGithubActivity(
  username: string,
): Promise<GithubOutput> {
  // Validate inputs
  if (!username || typeof username !== "string" || username.trim() === "") {
    console.warn("Invalid GitHub username provided");
    return { data: undefined };
  }

  // Check for API token
  const token = process.env.API_GITHUB_TOKEN;
  if (!token) {
    console.warn(
      "API_GITHUB_TOKEN environment variable is not set. GitHub activity will not be displayed.",
    );
    return { data: undefined };
  }

  try {
    const response = await fetch(`https://api.github.com/graphql`, {
      next: { revalidate: 60 * 60 * 24 }, // Cache for 24 hours
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
        query {
          user(login: "${username.trim()}") {
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
    });

    // Check HTTP response status
    if (!response.ok) {
      const statusText = response.statusText;
      const status = response.status;

      if (status === 401) {
        console.error(
          "GitHub API authentication failed. Please check your API_GITHUB_TOKEN.",
        );
      } else if (status === 403) {
        console.error(
          "GitHub API rate limit exceeded or forbidden. Consider using a different token or waiting.",
        );
      } else {
        console.error(
          `GitHub API request failed with status ${status}: ${statusText}`,
        );
      }

      return { data: undefined };
    }

    const data: unknown = await response.json();

    // Validate response structure
    if (!isValidGithubResponse(data)) {
      console.error("GitHub API returned invalid or incomplete data");
      return { data: undefined };
    }

    return data;
  } catch (error) {
    // Handle network errors, JSON parsing errors, etc.
    if (error instanceof Error) {
      console.error(`Failed to fetch GitHub activity: ${error.message}`);
    } else {
      console.error("Failed to fetch GitHub activity: Unknown error");
    }

    return { data: undefined };
  }
}
