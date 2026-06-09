/// <reference types="astro/client" />

// ═══════════════════════════════════════════════════════════════
// TIPOS DE VARIABLES DE ENTORNO
//
// Declara el tipo de cada variable de import.meta.env para que
// TypeScript pueda validarlas en tiempo de compilación.
//
// Fuente de verdad: .env.example
// Las variables marcadas como opcionales (| undefined) solo son
// necesarias si activas la funcionalidad correspondiente.
// ═══════════════════════════════════════════════════════════════

declare namespace App {
  interface Locals {
    // Usuario autenticado en la sesión actual (null si no hay sesión)
    user?: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      roleId: number;       // 1 = USER, 2 = ADMIN
      hasPassword: boolean; // false para cuentas creadas con GitHub OAuth
    };
  }
}

interface ImportMetaEnv {
  // ─── Entorno ─────────────────────────────────────────────────
  /** "development" en local, "production" en el VPS */
  readonly NODE_ENV: string;

  // ─── Servidor ────────────────────────────────────────────────
  /** IP de escucha. Usar "0.0.0.0" en VPS para que Nginx haga el proxy */
  readonly HOST: string;
  /** Puerto en el que escucha el servidor Node.js (por defecto 4321) */
  readonly PORT: string;
  /** URL pública completa del sitio, con protocolo y sin barra final */
  readonly SITE_URL: string;

  // ─── Base de datos ────────────────────────────────────────────
  /** Cadena de conexión PostgreSQL. Nunca exponer en logs ni respuestas */
  readonly DATABASE_URL: string;

  // ─── Autenticación JWT ────────────────────────────────────────
  /** Clave secreta para firmar los JWT. Mínimo 32 chars, idealmente 64 hex */
  readonly JWT_SECRET: string;
  /** Tiempo de expiración de los tokens. Ej: "7d", "30d" */
  readonly JWT_EXPIRES_IN: string;

  // ─── Email (Resend) ───────────────────────────────────────────
  /** API key de Resend para enviar emails de verificación y recuperación */
  readonly RESEND_API_KEY: string;
  /** Dirección remitente verificada en Resend. Ej: "DevLog <noreply@dominio.com>" */
  readonly EMAIL_FROM: string;

  // ─── GitHub OAuth (opcional) ──────────────────────────────────
  /** Client ID de la OAuth App de GitHub. Requerido para login con GitHub */
  readonly GITHUB_CLIENT_ID: string | undefined;
  /** Client Secret de la OAuth App de GitHub. Nunca exponer en el cliente */
  readonly GITHUB_CLIENT_SECRET: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
