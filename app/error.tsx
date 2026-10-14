"use client";

import { useEffect } from "react";
import { Broken } from "@/components/notice";

// A page that threw while rendering, inside the site's frame: the bar and the
// footer stay, the page's room shows what broke (components/notice).

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <title>something went wrong · e-ID</title>
      <Broken digest={error.digest} retry={retry} />
    </>
  );
}
