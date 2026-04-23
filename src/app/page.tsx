import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import { SignedIn, SignedOut } from "@/components/AuthGate";

export default function Home() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}