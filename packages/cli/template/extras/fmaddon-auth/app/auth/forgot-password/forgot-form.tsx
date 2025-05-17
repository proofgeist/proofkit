"use client";

import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextInput, Button, Stack, Paper, Text } from "@mantine/core";
import { forgotPasswordAction } from "./actions";
import { forgotPasswordSchema } from "./schema";

export default function ForgotForm() {
  const { form, handleSubmitWithAction, action } = useHookFormAction(
    forgotPasswordAction,
    zodResolver(forgotPasswordSchema),
    {}
  );

  return (
    <form onSubmit={handleSubmitWithAction}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <TextInput
            autoFocus
            label="Email"
            placeholder="you@proofkit.dev"
            required
            withAsterisk={false}
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />

          {action.result.data?.error && (
            <Text c="red">{action.result.data.error}</Text>
          )}

          <Button fullWidth type="submit" loading={action.isPending}>
            Send Reset Email
          </Button>
        </Stack>
      </Paper>
    </form>
  );
}
