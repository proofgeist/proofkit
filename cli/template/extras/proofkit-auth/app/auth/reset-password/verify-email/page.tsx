import { Alert, Anchor, Container, Text, Title } from "@mantine/core";
import VerifyEmailForm from "./verify-email-form";
import { env } from "@/config/env";
import { validatePasswordResetSessionRequest } from "@/server/auth/utils/password-reset";
import { redirect } from "next/navigation";

export default async function Page() {
  const { session } = await validatePasswordResetSessionRequest();
  if (session === null) {
    return redirect("/auth/forgot-password");
  }
  if (session.email_verified) {
    return redirect("/auth/reset-password");
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Verify Email</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter the code sent to your email.
      </Text>

      <VerifyEmailForm />

      <Text ta="center" mt={10}>
        <Anchor size="sm" component="a" href="/auth/login" c="dimmed">
          Back to login
        </Anchor>
      </Text>
    </Container>
  );
}
