import { generateRandomOTP } from "./index";
import { encodeBase32 } from "@oslojs/encoding";
import { cookies } from "next/headers";
import { getCurrentSession } from "./session";
import { emailVerificationLayout } from "../db/client";
import { TemailVerification } from "../db/emailVerification";

export async function getUserEmailVerificationRequest(
  userId: string,
  id: string
): Promise<TemailVerification | null> {
  const result = await emailVerificationLayout.maybeFindFirst({
    query: { id_user: `==${userId}`, id: `==${id}` },
  });
  return result?.data.fieldData ?? null;
}

export async function createEmailVerificationRequest(
  id_user: string,
  email: string
): Promise<TemailVerification> {
  deleteUserEmailVerificationRequest(id_user);
  const idBytes = new Uint8Array(20);
  crypto.getRandomValues(idBytes);
  const id = encodeBase32(idBytes).toLowerCase();

  const code = generateRandomOTP();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

  const request: TemailVerification = {
    id,
    code,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    email,
    id_user,
  };

  await emailVerificationLayout.create({
    fieldData: request,
  });

  return request;
}

export async function deleteUserEmailVerificationRequest(
  id_user: string
): Promise<void> {
  const result = await emailVerificationLayout.maybeFindFirst({
    query: { id_user: `==${id_user}` },
  });
  if (result === null) return;

  await emailVerificationLayout.delete({ recordId: result.data.recordId });
}

export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  console.log(`To ${email}: Your verification code is ${code}`);
}

export async function setEmailVerificationRequestCookie(
  request: TemailVerification
): Promise<void> {
  (await cookies()).set("email_verification", request.id, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: request.expires_at
      ? new Date(request.expires_at * 1000)
      : new Date(Date.now() + 1000 * 60 * 60),
  });
}

export async function deleteEmailVerificationRequestCookie(): Promise<void> {
  (await cookies()).set("email_verification", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}

export async function getUserEmailVerificationRequestFromRequest(): Promise<TemailVerification | null> {
  const { user } = await getCurrentSession();
  if (user === null) {
    return null;
  }
  const id = (await cookies()).get("email_verification")?.value ?? null;
  if (id === null) {
    return null;
  }
  const request = await getUserEmailVerificationRequest(user.id, id);

  return request;
}
