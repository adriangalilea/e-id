

import dynamic from "next/dynamic";
const EID = dynamic(() => import("@/components/e-id"), {
  ssr: false,
});

export default function Page({ params }: { params: { slug: string } }) {
  return <EID params={params}/>;
}
