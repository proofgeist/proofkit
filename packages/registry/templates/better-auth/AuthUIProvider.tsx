"use client";

import { AuthUIProvider as BetterAuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/registry/lib/auth-client";

export function AuthUIProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <BetterAuthUIProvider
      authClient={authClient}
      Link={Link}
      navigate={router.push}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      replace={router.replace}
    >
      {children}
    </BetterAuthUIProvider>
  );
}
