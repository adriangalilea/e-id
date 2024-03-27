"use client";
import GitHubCalendar from "react-github-calendar";

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

export default function GitHubActivity({ username }: { username: string }) {
  return (
    <div className="flex justify-end overflow-auto relative">
      <div className="min-w-max">
        <GitHubCalendar
          username={username}
          hideColorLegend
          blockMargin={2}
          blockRadius={0}
          blockSize={10}
          hideMonthLabels
          hideTotalCount
        />
      </div>
      <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-zinc-50 dark:from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}
