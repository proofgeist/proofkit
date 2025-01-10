"use server";

import { actionClient } from "@/server/safe-action";
import { loginSchema } from "./schema";
import { validateLogin } from "@/server/auth/utils/user";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "@/server/auth/utils/session";
import { redirect } from "next/navigation";
import { getRedirectCookie } from "@/server/auth/utils/redirect";

export const loginAction = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const user = await validateLogin(email, password);

    if (user === null) {
      return { error: "Invalid email or password" };
    }

    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, user.id);
    setSessionTokenCookie(sessionToken, session.expiresAt);

    if (!user.emailVerified) {
      return redirect("/auth/verify-email");
    }

    const redirectTo = await getRedirectCookie();
    return redirect(redirectTo);
  });
