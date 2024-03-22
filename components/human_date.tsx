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
        className="text-sm underline decoration-transparent underline-offset-2 transition-all duration-300 ease-in-out hover:decoration-neutral-500"
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
      className="text-sm underline decoration-transparent underline-offset-2 transition-all duration-300 ease-in-out hover:decoration-neutral-500"
    >
      {pretext === "edited" ? "✎" : ""}
      {formatBasedOnDay}
    </time>
  );
}
