"use client";

import { AuthUIProvider as BetterAuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/registry/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <BetterAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      Link={Link}
    >
      {children}
    </BetterAuthUIProvider>
  );
}
