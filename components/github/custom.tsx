"use client";

import ActivityCalendar  from "./index";
import { ThemeInput } from "./types";

const explicitTheme: ThemeInput = {
  light: [
    "hsl(190, 40%, 90%)",
    "hsl(145, 55%, 76%)",
    "hsl(135, 60%, 65%)",
    "hsl(128, 55%, 55%)",
    "hsl(123, 55%, 45%)",
  ],
  dark: [
    "hsl(190, 25%, 8%)",
    "hsl(150, 35%, 25%)",
    "hsl(143, 40%, 35%)",
    "hsl(133, 45%, 45%)",
    "hsl(123, 55%, 52%)",
  ],
};

type flattenedData = {
  date: string;
  count: number;
  level: number;
}[];

export default function GitHubActivity({
  data,
}: {
  data: flattenedData;
}) {
  return (
    <div
      className="relative flex justify-end overflow-auto border bg-zinc-300/80 py-0.5 pr-1
        dark:bg-zinc-700/80"
    >
      <div className="min-w-max">
        <ActivityCalendar
          data={data}
          theme={explicitTheme}
          hideColorLegend
          blockMargin={1.5}
          blockRadius={0}
          blockSize={11.5}
          hideMonthLabels
          hideTotalCount
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
