import { auth } from "@/../auth";
import HomeClient from "@/components/HomeClient";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <HomeClient initialStep="landing" />;
  }

  const user = session.user as typeof session.user & {
    profileId?: string | null;
    onboardingCompleted?: boolean | null;
  };

  if (!user?.profileId || user.onboardingCompleted !== true) {
    redirect("/onboarding");
  }

  return <HomeClient initialStep="conversation" />;
}
