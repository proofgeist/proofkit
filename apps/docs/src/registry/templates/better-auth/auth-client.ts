import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [],
});

export const { signIn, signUp, useSession } = authClient;
