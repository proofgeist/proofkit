"use client";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { loginSchema } from "./schema";
import { loginAction } from "./actions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Anchor,
  Button,
  Group,
  Paper,
  PasswordInput,
  Text,
} from "@mantine/core";
import { TextInput } from "@mantine/core";
import { Stack } from "@mantine/core";

export default function LoginForm() {
  const { form, handleSubmitWithAction, action } = useHookFormAction(
    loginAction,
    zodResolver(loginSchema),
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
          <PasswordInput
            label="Password"
            placeholder="Your password"
            autoComplete="current-password"
            required
            withAsterisk={false}
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />

          <Group justify="end">
            <Anchor size="sm" component="a" href="/auth/forgot-password">
              Forgot password?
            </Anchor>
          </Group>
          {action.result.data?.error ? (
            <Text c="red">{action.result.data.error}</Text>
          ) : action.hasErrored ? (
            <Text c="red">An error occured</Text>
          ) : null}
          <Button fullWidth type="submit" loading={action.isPending}>
            Sign in
          </Button>
        </Stack>
      </Paper>
    </form>
  );
}
