import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Code, Container, Stack, Text, Title } from "@mantine/core";

export const Route = createFileRoute("/secondary")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Container mt="5rem">
      <Stack gap="xl" ta="center">
        <Title order={1}>Secondary Page</Title>
        <Text>
          Use hidden pages like this to embedd multiple webviewer widgets into a
          single HTML bundle of your FileMaker solution.
        </Text>
        <Text>
          See how to navigate via a FileMaker script in the{" "}
          <Code>EXAMPLE: Navigation</Code> script
        </Text>
        <Text c="dimmed" size="sm">
          <Link to="/">Go back to the home page</Link>
        </Text>
      </Stack>
    </Container>
  );
}
