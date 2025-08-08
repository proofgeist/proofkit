import React from "react";
import { Header } from "@/components/AppShell/internal/Header";
import { headerHeight } from "./config";

export default function MainAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header style={{ height: headerHeight }}>
        <Header />
      </header>
      <main className="min-h-[calc(100dvh-var(--header-height,56px))]">
        {children}
      </main>
    </div>
  );
}
