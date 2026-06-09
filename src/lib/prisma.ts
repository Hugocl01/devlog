import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Astro/Vite carga el .env en import.meta.env (no en process.env).
// process.env sirve de fallback para scripts externos (seed, migraciones).
const connectionString =
  (import.meta.env?.DATABASE_URL as string | undefined) ??
  process.env.DATABASE_URL;

const isDev =
  (import.meta.env?.MODE as string | undefined) === "development" ||
  process.env.NODE_ENV === "development";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: isDev ? ["query", "warn", "error"] : ["error"],
  });
}

// Singleton para evitar múltiples conexiones durante el hot-reload en desarrollo.
// La clave incluye la connectionString para detectar singletons stale.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaKey: string | undefined;
};

const currentKey = connectionString ?? "";

if (globalForPrisma.prismaKey !== currentKey) {
  // connectionString cambió (o primer arranque): descartar el cliente anterior
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaKey = currentKey;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDev) {
  globalForPrisma.prisma = prisma;
}
