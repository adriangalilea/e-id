export default function Loading() {
  return (
    <main className="animate-pulse">
      <div>
        <div className="flex flex-col justify-between gap-1.5 pt-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-end justify-between sm:grow">
            <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-10 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:gap-4">
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </main>
  );
}
