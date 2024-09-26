"use client";
import { Stack, TextInput, PasswordInput, Button, Text } from "@mantine/core";
import Link from "next/link";
import React from "react";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { signUpAction } from "./action";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "./validation";

export default function SignUpPage(props: {
  searchParams: { callbackUrl: string | undefined };
}) {
  const { form, action, handleSubmitWithAction, resetFormAndAction } =
    useHookFormAction(signUpAction, zodResolver(signUpSchema), {
      actionProps: {},
      formProps: {},
      errorMapProps: {},
    });

  return (
    <Stack>
      <form onSubmit={handleSubmitWithAction}>
        <Stack>
          <TextInput type="email" {...form.register("email")} label="Email" />
          <PasswordInput {...form.register("password")} label="Password" />
          <PasswordInput
            {...form.register("passwordConfirm")}
            label="Confirm Password"
          />
          <Button type="submit">Sign up</Button>
        </Stack>
      </form>
      <Text size="sm" c="dimmed">
        Already have an account? <Link href="/auth/signin">Sign in</Link>
      </Text>
    </Stack>
  );
}
