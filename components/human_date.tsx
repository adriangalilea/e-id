import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import LocalizedFormat from "dayjs/plugin/localizedFormat";

// Extend dayjs with the plugins
dayjs.extend(LocalizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export default async function HumanTime({
  date,
  pretext = "",
}: {
  date: Date;
  pretext?: string;
}) {
  const now = dayjs();
  const dateDayjs = dayjs(date);
  const isToday = dateDayjs.isSame(now, "day");
  const isoString = dateDayjs.toISOString();
  const localeString = dateDayjs.format("LLLL");

  const displayPretext = pretext ? `${pretext} ` : "";

  const formatBasedOnDay = isToday
    ? dateDayjs.fromNow()
    : dateDayjs.format("MMM D");
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
