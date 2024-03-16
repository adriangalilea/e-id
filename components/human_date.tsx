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

export default async function HumanTime({
  date,
  pretext = "",
}: {
  date: string;
  pretext?: string;
}) {
  const currentUserTimezone = dayjs.tz.guess();
  const dateLocal = dayjs.utc(date).tz(currentUserTimezone);
  const nowLocal = dayjs().tz(currentUserTimezone);

  const isToday = dateLocal.isSame(nowLocal, "day");
  const isoString = dateLocal.toISOString();
  const localeString = dateLocal.format("LLLL");

  const displayPretext = pretext ? `${pretext} ` : "";

  // Use the local time for accurate "from now" calculations
  const formatBasedOnDay = isToday
    ? dateLocal.from(nowLocal)
    : dateLocal.format("MMM D");

  return (
    <time
      dateTime={isoString}
      title={displayPretext + localeString}
      className="text-sm underline underline-offset-2 decoration-transparent hover:decoration-neutral-500 transition-all ease-in-out duration-300"
    >
      {pretext === "edited" ? "✎" : ""}
      {formatBasedOnDay}
    </time>
  );
}
