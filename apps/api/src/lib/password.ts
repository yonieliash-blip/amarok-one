import argon2 from "argon2";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function hashToken(token: string): Promise<string> {
  return argon2.hash(token, { type: argon2.argon2id, memoryCost: 32768, timeCost: 2 });
}

export async function verifyTokenHash(token: string, tokenHash: string): Promise<boolean> {
  try {
    return await argon2.verify(tokenHash, token);
  } catch {
    return false;
  }
}
