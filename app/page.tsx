import dynamic from "next/dynamic";
const UserProfileForm = dynamic(() => import("../components/Form"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <main className="max-w-sm w-full items-center justify-between">
        <UserProfileForm />
      </main>
    </>
  );
}
