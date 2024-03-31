export const LoadingSkeleton = () => (
  <>
    <table className="h-fit w-full caption-bottom">
      <caption className="mt-4 text-left">
        <Skeleton className="w-[120px] max-w-full" />
      </caption>
      <thead className="[&_tr]:border-b">
        <tr className="border-b transition-colors">
          <th className="h-12 px-4 pr-0 text-left align-middle">
            <Skeleton className="w-[64px] max-w-full" />{" "}
            {/* Adjusted for country */}
          </th>
          <th className="h-12 px-4 pr-0 text-left align-middle">
            <Skeleton className="w-[100px] max-w-full" />{" "}
            {/* Adjusted for user */}
          </th>
          <th className="h-12 px-4 pr-0 text-left align-middle">
            <Skeleton className="w-[80px] max-w-full" />{" "}
            {/* Adjusted for time */}
          </th>
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {[...Array(6)].map((_, index) => (
          <tr key={index} className="border-b transition-colors">
            <td className="p-4 pr-0 align-middle">
              <SVGSkeleton className="!m-0 h-6 w-6" />{" "}
              {/* Adjusted for flag size */}
            </td>
            <td className="p-4 pr-0 align-middle">
              <Skeleton
                className={`w-[${index % 2 === 0 ? "120" : "88"}px] max-w-full`}
              />{" "}
              {/* Varied width for user */}
            </td>
            <td className="p-4 pr-0 align-middle">
              <Skeleton className="w-[80px] max-w-full" />{" "}
              {/* Consistent time */}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);

const Skeleton = ({ className }: { className: string }) => (
  <div aria-live="polite" aria-busy="true" className={className}>
    <span className="inline-flex w-full animate-pulse select-none rounded-md bg-gray-300 leading-none">
      ‌
    </span>
    <br />
  </div>
);

const SVGSkeleton = ({ className }: { className: string }) => (
  <svg className={className + " animate-pulse rounded bg-gray-300"} />
);
