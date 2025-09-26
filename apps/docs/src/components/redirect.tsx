"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "./ui/skeleton";

export default function Redirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return <Skeleton className="h-8 w-full" />;
}
