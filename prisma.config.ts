// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE LA CLI DE PRISMA
//
// Este fichero configura el comportamiento de los comandos de la
// CLI de Prisma (prisma migrate, prisma studio, prisma db seed…).
// No confundir con prisma/schema.prisma, que define el modelo de datos.
//
// Roles de cada fichero relacionado:
//   prisma.config.ts        → configuración de la CLI (este fichero)
//   prisma/schema.prisma    → modelo de datos y generación del cliente
//   prisma/migrations/      → historial de cambios SQL aplicados a la BD
//   prisma/seed.ts          → datos iniciales de desarrollo
//
// La carga de dotenv permite que la CLI acceda a DATABASE_URL desde
// el fichero .env sin necesidad de exportar la variable manualmente.
// ═══════════════════════════════════════════════════════════════

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Ruta al fichero de esquema Prisma.
  schema: "prisma/schema.prisma",

  migrations: {
    // Directorio donde se almacenan las migraciones SQL generadas.
    path: "prisma/migrations",

    // Comando que ejecuta `prisma db seed`.
    // tsx permite ejecutar TypeScript directamente sin compilar.
    // --env-file=.env carga las variables de entorno antes de correr el seed.
    seed: "tsx --env-file=.env prisma/seed.ts",
  },

  datasource: {
    // URL de conexión a PostgreSQL. Se lee de la variable de entorno
    // DATABASE_URL definida en .env (cargada por dotenv/config arriba).
    url: process.env["DATABASE_URL"],
  },
});
