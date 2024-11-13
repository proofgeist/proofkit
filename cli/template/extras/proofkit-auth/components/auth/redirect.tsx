"use client";

import { redirect } from "next/navigation";
import { Center, Loader } from "@mantine/core";
import { useEffect } from "react";
import Cookies from "js-cookie";

/**
 * A client-side component that redirects to the given path, but saves the current path in the redirectTo cookie.
 */
export default function AuthRedirect({ path }: { path: string }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      Cookies.set("redirectTo", window.location.pathname, {
        expires: 1 / 24 / 60, // 1 hour
      });
      redirect(path);
    }
  }, []);

  return (
    <Center h="100vh">
      <Loader />
    </Center>
  );
}
