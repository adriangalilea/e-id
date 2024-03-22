import dynamic from "next/dynamic";
const UserProfileForm = dynamic(() => import("./Form"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <main className="w-full max-w-sm items-center justify-between">
        <UserProfileForm />
      </main>
    </>
  );
}
