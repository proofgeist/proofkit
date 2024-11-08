"use client";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { emailVerificationSchema } from "./schema";
import { verifyEmailAction } from "./actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Anchor, Button, Group, Paper, PinInput, Text } from "@mantine/core";
import { Stack } from "@mantine/core";

export default function LoginForm() {
  const { form, handleSubmitWithAction, action } = useHookFormAction(
    verifyEmailAction,
    zodResolver(emailVerificationSchema),
    {}
  );

  return (
    <form onSubmit={handleSubmitWithAction}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <PinInput
            length={8}
            autoFocus
            oneTimeCode
            {...form.register("code")}
            onChange={(value) => form.setValue("code", value)}
          />

          {action.result.data?.error ? (
            <Text c="red">{action.result.data.error}</Text>
          ) : action.hasErrored ? (
            <Text c="red">An error occured</Text>
          ) : null}
          <Button fullWidth type="submit" loading={action.isPending}>
            Verify email
          </Button>
        </Stack>
      </Paper>
    </form>
  );
}
