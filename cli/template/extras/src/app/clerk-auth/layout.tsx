import React from "react";
import { Center } from "@mantine/core";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Center h="100vh">{children}</Center>;
}
