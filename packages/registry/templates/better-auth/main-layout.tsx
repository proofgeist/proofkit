import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import type React from "react";
import AppShell from "@/components/AppShell/internal/AppShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RedirectToSignIn />

      <SignedIn>
        <AppShell>{children}</AppShell>
      </SignedIn>
    </>
  );
}
