import { getCurrentSession } from "@/server/auth/utils/session";
import { Anchor, Container, Text, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import EmailVerificationForm from "./email-verification-form";
import ResendButton from "./resend-button";
import {
  createEmailVerificationRequest,
  getUserEmailVerificationRequestFromRequest,
  sendVerificationEmail,
  setEmailVerificationRequestCookie,
} from "@/server/auth/utils/email-verification";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect("/auth/login");
  }

  // TODO: Ideally we'd sent a new verification email automatically if the previous one is expired,
  // but we can't set cookies inside server components.
  let verificationRequest = await getUserEmailVerificationRequestFromRequest();
  if (verificationRequest === null && user.emailVerified) {
    return redirect("/");
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Verify your email</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter the code sent to {verificationRequest?.email ?? user.email}
      </Text>
      <Text c="dimmed" size="sm" ta="center">
        <Anchor href="/auth/profile">Change email</Anchor>
      </Text>

      <EmailVerificationForm />
      <ResendButton />
    </Container>
  );
}