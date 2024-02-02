import dynamic from "next/dynamic";
const UserProfileForm = dynamic(() => import("../components/Form"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="p-4 sm:py-5 sm:px-10 lg:px-16 lg:py-8">
      <div className="z-10 max-w-sm w-full items-center justify-between">
        <UserProfileForm />
      </div>
    </main>
  );
}
