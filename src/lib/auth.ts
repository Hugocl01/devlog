import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const JWT_SECRET =
  (import.meta.env?.JWT_SECRET as string | undefined) ??
  process.env.JWT_SECRET ??
  "dev-secret-cambiar-en-produccion";
const JWT_EXPIRES_IN = (
  (import.meta.env?.JWT_EXPIRES_IN as string | undefined) ??
  process.env.JWT_EXPIRES_IN ??
  "7d"
) as jwt.SignOptions["expiresIn"];

export const PASSWORD_MAX_LENGTH = 128;

// Hash pre-computado para timing-safe login cuando el usuario no existe
export const DUMMY_HASH = "$2a$12$dummy.hash.used.only.to.equalize.bcrypt.timing.costs.xx";

export async function hashPassword(password: string) {
  if (password.length > PASSWORD_MAX_LENGTH) throw new Error("Contraseña demasiado larga");
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  // Evita DoS: bcrypt es lento con entradas muy largas
  if (password.length > PASSWORD_MAX_LENGTH) return false;
  return bcrypt.compare(password, hash);
}

export function createJWT(userId: string, expiresIn?: jwt.SignOptions["expiresIn"]): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: expiresIn ?? JWT_EXPIRES_IN });
}

export function verifyJWT(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
