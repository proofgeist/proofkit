import { usersLayout } from "../db/client";
import { Tusers as _User } from "../db/users";

export type User = Omit<
  _User,
  "password_hash" | "recovery_code" | "emailVerified"
> & {
  emailVerified: boolean;
};

import { hashPassword, verifyPasswordHash } from "./password";

async function fetchUser(userId: string) {
  const { data } = await usersLayout.findOne({
    query: { id: `==${userId}` },
  });
  return data;
}

export async function createUser(
  email: string,
  password: string
): Promise<User> {
  const password_hash = await hashPassword(password);
  const { recordId } = await usersLayout.create({
    fieldData: {
      email,
      password_hash,
      emailVerified: 0,
    },
  });
  const fmResult = await usersLayout.get({ recordId });
  const { fieldData } = fmResult.data[0];

  const user: User = {
    id: fieldData.id,
    email,
    emailVerified: false,
    username: "",
  };
  return user;
}

export async function updateUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const password_hash = await hashPassword(password);
  const { recordId } = await fetchUser(userId);

  await usersLayout.update({ recordId, fieldData: { password_hash } });
}

export async function updateUserEmailAndSetEmailAsVerified(
  userId: string,
  email: string
): Promise<void> {
  const { recordId } = await fetchUser(userId);
  await usersLayout.update({
    recordId,
    fieldData: { email, emailVerified: 1 },
  });
}

export async function setUserAsEmailVerifiedIfEmailMatches(
  userId: string,
  email: string
): Promise<boolean> {
  try {
    const {
      data: { recordId },
    } = await usersLayout.findOne({
      query: { id: `==${userId}`, email: `==${email}` },
    });
    await usersLayout.update({ recordId, fieldData: { emailVerified: 1 } });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getUserFromEmail(email: string): Promise<User | null> {
  const fmResult = await usersLayout.maybeFindFirst({
    query: { email: `==${email}` },
  });
  if (fmResult === null) return null;

  const {
    data: { fieldData },
  } = fmResult;

  const user: User = {
    id: fieldData.id,
    email: fieldData.email,
    emailVerified: Boolean(fieldData.emailVerified),
    username: fieldData.username,
  };
  return user;
}

export async function validateLogin(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const {
      data: { fieldData },
    } = await usersLayout.findOne({
      query: { email: `==${email}` },
    });

    const validPassword = await verifyPasswordHash(
      fieldData.password_hash,
      password
    );
    if (!validPassword) {
      return null;
    }
    const user: User = {
      id: fieldData.id,
      email: fieldData.email,
      emailVerified: Boolean(fieldData.emailVerified),
      username: fieldData.username,
    };
    return user;
  } catch (error) {
    return null;
  }
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  const { data } = await usersLayout.find({
    query: { email: `==${email}` },
    ignoreEmptyResult: true,
  });
  return data.length === 0;
}
