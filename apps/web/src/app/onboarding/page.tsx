import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth-forms";
import { requireUser } from "@/server/session";
export default async function Page() {
  await requireUser();
  return <Suspense><OnboardingForm /></Suspense>;
}
