import React from "react";
import { Center, Card } from "@mantine/core";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session) {
    return redirect("/");
  }
  return (
    <Center h="100vh">
      <Card withBorder radius="md" shadow="sm" w={"20rem"}>
        {children}
      </Card>
    </Center>
  );
}
