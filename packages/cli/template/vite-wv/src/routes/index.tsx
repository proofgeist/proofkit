import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Anchor,
  Box,
  Code,
  Container,
  Image,
  px,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <Container mt="5rem">
      <Stack gap="xl" ta="center">
        <Image
          src="https://raw.githubusercontent.com/proofgeist/proofkit/dde6366c529104658dfba67a8fc2910a8644fc64/docs/src/assets/proofkit.png"
          alt="ProofKit"
          style={{
            marginRight: "auto",
            marginLeft: "auto",
          }}
          w={"auto"}
          mah={px("16rem")}
        />
        <Title order={1}>Welcome!</Title>

        <Text style={{ textWrap: "balance" }}>
          This is the base template page. To add more pages, components, or
          other features, run the ProofKit CLI from within your project.
        </Text>
        <Code block>pnpm proofkit</Code>

        <Text style={{ textWrap: "balance" }}>
          To change this page, open <Code>src/routes/index.tsx</Code>
        </Text>
        <Box>
          <Anchor
            href="https://proofkit.dev"
            target="_blank"
            rel="proofkit-app"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            ProofKit Docs <IconExternalLink size={px("1rem")} />
          </Anchor>
        </Box>

        <Text c="dimmed" size="sm">
          Need to build multiple webviewer widgets?{" "}
          <Link to="/secondary">Check out the secondary page</Link>
        </Text>
      </Stack>
    </Container>
  );
}
