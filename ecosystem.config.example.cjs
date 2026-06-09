// ══════════════════════════════════════════════
// CONFIGURACIÓN PM2 — PLANTILLA PARA EL VPS
//
// 1. Copia este archivo como ecosystem.config.cjs
// 2. Rellena todos los valores marcados con CAMBIAR
// 3. El archivo real (ecosystem.config.cjs) está en .gitignore
//    porque contiene secretos de producción
//
// Comandos útiles en el VPS:
//   pm2 start ecosystem.config.cjs --env production   ← arrancar
//   pm2 reload ecosystem.config.cjs --env production  ← recargar sin downtime
//   pm2 stop devlog                                    ← parar
//   pm2 logs devlog                                    ← ver logs
//   pm2 save                                           ← persistir entre reinicios
//   pm2 startup                                        ← arrancar al iniciar el servidor
// ══════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: "devlog",
      script: "./dist/server/entry.mjs",

      // Una sola instancia es suficiente para empezar.
      // Cambia a "max" para usar todos los núcleos del VPS cuando escale.
      instances: 1,

      // Reinicia automáticamente si el proceso cae
      autorestart: true,
      max_memory_restart: "512M",

      // No observar cambios de archivo en producción
      watch: false,

      env_production: {
        NODE_ENV: "production",

        // ─── Servidor ────────────────────────────────
        // 0.0.0.0 permite que Nginx haga el proxy desde fuera
        HOST: "0.0.0.0",
        PORT: "4321",
        SITE_URL: "https://CAMBIAR_POR_TU_DOMINIO.com",

        // ─── Base de datos ───────────────────────────
        DATABASE_URL:
          "postgresql://CAMBIAR_USUARIO:CAMBIAR_CONTRASEÑA@localhost:5432/devlog?schema=public",

        // ─── JWT ─────────────────────────────────────
        // Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        JWT_SECRET: "CAMBIAR_POR_CLAVE_SECRETA_MUY_LARGA",
        JWT_EXPIRES_IN: "7d",

        // ─── Email ───────────────────────────────────
        RESEND_API_KEY: "re_CAMBIAR_POR_TU_API_KEY",
        EMAIL_FROM: "DevLog <noreply@CAMBIAR_POR_TU_DOMINIO.com>",

        // ─── GitHub OAuth ─────────────────────────────
        // Crea la OAuth App en: github.com/settings/developers
        // Callback URL: https://CAMBIAR_POR_TU_DOMINIO.com/api/auth/github/callback
        GITHUB_CLIENT_ID: "CAMBIAR_POR_TU_CLIENT_ID",
        GITHUB_CLIENT_SECRET: "CAMBIAR_POR_TU_CLIENT_SECRET",
      },
    },
  ],
};
