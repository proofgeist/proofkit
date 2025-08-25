import AppShell from "@/components/AppShell/internal/AppShell";
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import React from "react";

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
