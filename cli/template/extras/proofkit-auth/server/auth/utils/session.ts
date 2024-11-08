import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "./user";

import { sessionsLayout } from "../db/client";
import { Tsessions as _Session } from "../db/sessions";

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: string
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    user_id: userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };

  // create session in DB
  await sessionsLayout.create({
    fieldData: {
      id: session.id,
      user_id: session.user_id,
      expiresAt: Math.floor(session.expiresAt.getTime() / 1000),
    },
  });

  return session;
}

export async function invalidateSession(sessionId: string): Promise<void> {
  const fmResult = await sessionsLayout.maybeFindFirst({
    query: { id: `==${sessionId}` },
  });
  if (fmResult === null) {
    return;
  }
  await sessionsLayout.delete({ recordId: fmResult.data.recordId });
}

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const result = await sessionsLayout.maybeFindFirst({
    query: { id: `==${sessionId}` },
  });
  if (result === null) {
    return { session: null, user: null };
  }

  const fmResult = result.data.fieldData;
  const recordId = result.data.recordId;
  const session: Session = {
    id: fmResult.id,
    user_id: fmResult.user_id,
    expiresAt: fmResult.expiresAt
      ? new Date(fmResult.expiresAt * 1000)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };

  const user: User = {
    id: session.user_id,
    email: fmResult["proofkit_auth_users::email"],
    emailVerified: Boolean(fmResult["proofkit_auth_users::emailVerified"]),
    username: fmResult["proofkit_auth_users::username"],
  };
  if (Date.now() >= session.expiresAt.getTime()) {
    await sessionsLayout.delete({ recordId });
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await sessionsLayout.update({
      recordId,
      fieldData: {
        expiresAt: Math.floor(session.expiresAt.getTime() / 1000),
      },
    });
  }
  return { session, user };
}

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const token = (await cookies()).get("session")?.value ?? null;
    if (token === null) {
      return { session: null, user: null };
    }
    const result = await validateSessionToken(token);
    return result;
  }
);

export async function invalidateUserSessions(userId: string): Promise<void> {
  const sessions = await sessionsLayout.findAll({
    query: { user_id: `==${userId}` },
  });
  for await (const session of sessions) {
    await sessionsLayout.delete({ recordId: session.recordId });
  }
}

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  (await cookies()).set("session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  (await cookies()).set("session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}

export interface SessionFlags {}

export interface Session extends SessionFlags {
  id: string;
  expiresAt: Date;
  user_id: string;
}

type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };
