import Nav from "@/components/Nav";
import dynamic from "next/dynamic";
const UserProfileForm = dynamic(() => import("../components/Form"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <main className="z-10 max-w-sm w-full items-center justify-between">
        <UserProfileForm />
      </main>
    </>
  );
}
