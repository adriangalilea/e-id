"use client";
import GitHubCalendar, { ThemeInput } from "react-github-calendar";

const selectLastHalfYear = (contributions: any) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const shownMonths = 6;

  return contributions.filter((activity: any) => {
    const date = new Date(activity.date);
    const monthOfDay = date.getMonth();

    return (
      date.getFullYear() === currentYear &&
      monthOfDay > currentMonth - shownMonths &&
      monthOfDay <= currentMonth
    );
  });
};

const explicitTheme: ThemeInput = {
  light: [
    "hsl(123, 0%, 98%)",
    "hsl(123, 10%, 90%)",
    "hsl(123, 20%, 75%)",
    "hsl(123, 35%, 60%)",
    "hsl(123, 55%, 52%)",
  ],
  dark: [
    "hsl(123, 6%, 8%)",
    "hsl(123, 10%, 25%)",
    "hsl(123, 30%, 35%)",
    "hsl(123, 45%, 45%)",
    "hsl(123, 55%, 52%)",
  ],
};
 // "#383838", "#4D455D", "#7DB9B6", "#F5E9CF", "#E96479"

export default function GitHubActivity({ username }: { username: string }) {
  return (
    <div className="relative flex justify-end overflow-auto">
      <div className="min-w-max">
        <GitHubCalendar
          username={username}
          hideColorLegend
          blockMargin={2}
          blockRadius={0}
          blockSize={10}
          hideMonthLabels
          hideTotalCount
          theme={explicitTheme}
        />
        <div
          className="absolute inset-0 w-24 backdrop-blur-sm"
          style={{
            maskImage: "linear-gradient(to left, transparent, white)",
          }}
        />
      </div>
    </div>
  );
}
