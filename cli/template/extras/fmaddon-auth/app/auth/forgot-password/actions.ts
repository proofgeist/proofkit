"use server";
import { actionClient } from "@/server/safe-action";
import { forgotPasswordSchema } from "./schema";
import { getUserFromEmail } from "@/server/auth/utils/user";
import { generateSessionToken } from "@/server/auth/utils/session";
import { redirect } from "next/navigation";
import {
  createPasswordResetSession,
  invalidateUserPasswordResetSessions,
  sendPasswordResetEmail,
  setPasswordResetSessionTokenCookie,
} from "@/server/auth/utils/password-reset";

export const forgotPasswordAction = actionClient
  .schema(forgotPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const user = await getUserFromEmail(email);
    if (user === null) {
      return {
        error: "Account does not exist",
      };
    }

    await invalidateUserPasswordResetSessions(user.id);
    const sessionToken = generateSessionToken();
    const session = await createPasswordResetSession(
      sessionToken,
      user.id,
      user.email
    );

    await sendPasswordResetEmail(session.email, session.code);
    await setPasswordResetSessionTokenCookie(sessionToken, session.expires_at);
    return redirect("/auth/reset-password/verify-email");
  });
