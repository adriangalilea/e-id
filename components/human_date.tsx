"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import LocalizedFormat from "dayjs/plugin/localizedFormat";

// Extend dayjs with the necessary plugins
dayjs.extend(LocalizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function HumanTime({
  date,
  pretext = "",
  dateOnly = false,
}: {
  date: string;
  pretext?: string;
  dateOnly?: boolean;
}) {
  const displayPretext = pretext ? `${pretext} ` : "";

  const currentUserTimezone = dayjs.tz.guess();
  const dateLocal = dayjs.utc(date).tz(currentUserTimezone);

  const isoString = dateLocal.toISOString();
  const localeString = dateLocal.format("LLLL");

  if (dateOnly) {
    return (
      <time
        dateTime={isoString}
        title={displayPretext + localeString}
        className="font-code px-1 py-0.5 text-xs font-normal opacity-50 hover:bg-zinc-500/20"
      >
        {dateLocal.format("YY/MM/DD")}
      </time>
    );
  }

  const nowLocal = dayjs().tz(currentUserTimezone);
  const isToday = dateLocal.isSame(nowLocal, "day");

  const formatBasedOnDay = isToday
    ? dateLocal.from(nowLocal)
    : dateLocal.format("MMM D");

  return (
    <time
      dateTime={isoString}
      title={displayPretext + localeString}
      className="font-code px-1 py-0.5 text-xs font-normal underline-offset-2
        hover:bg-zinc-500/20"
    >
      {pretext === "edited" ? "✎" : ""}
      {formatBasedOnDay}
    </time>
  );
}
