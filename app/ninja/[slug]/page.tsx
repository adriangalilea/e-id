

import dynamic from "next/dynamic";
const EID = dynamic(() => import("@/app/ninja/e-id"), {
  ssr: false,
});

export default function Page({ params }: { params: { slug: string } }) {
  return <EID slug={params.slug}/>;
}
