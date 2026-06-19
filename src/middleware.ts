import { defineMiddleware } from "astro:middleware";
import { verifyJWT } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Rutas de autenticación — si el usuario ya está logueado, redirigir al blog
const AUTH_ONLY_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, redirect }, next) => {
    const token = cookies.get("devlog_session")?.value;

    if (token) {
      const payload = verifyJWT(token);

      if (payload) {
        try {
          const session = await prisma.session.findUnique({
            where: { token },
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, roleId: true, banned: true, password: true },
              },
            },
          });

          if (session && session.expiresAt > new Date() && !session.user.banned) {
            const { password, banned, ...rest } = session.user;
            locals.user = { ...rest, hasPassword: password !== null };
          } else if (session?.user.banned) {
            // Expulsar sesión de usuario baneado
            await prisma.session.deleteMany({ where: { token } }).catch(() => {});
            cookies.delete("devlog_session", { path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax" });
          } else {
            // Sesión expirada o no encontrada en BD
            await prisma.session.deleteMany({ where: { token } }).catch(() => {});
            cookies.delete("devlog_session", { path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax" });
          }
        } catch {
          cookies.delete("devlog_session", { path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax" });
        }
      } else {
        // JWT inválido o expirado
        cookies.delete("devlog_session", { path: "/" });
      }
    }

    const path = url.pathname;

    // Redirigir a /blog si intenta acceder a login/register ya estando logueado
    if (locals.user && AUTH_ONLY_PATHS.some((p) => path.startsWith(p))) {
      return redirect("/blog");
    }

    // Rutas de admin — requieren sesión activa con roleId === 2
    if (path.startsWith("/admin")) {
      if (!locals.user) return redirect("/auth/login");
      if (locals.user.roleId !== 2) return redirect("/blog");
    }

    const response = await next();

    // Cabeceras de seguridad HTTP
    if (process.env.NODE_ENV === "production") {
      // HSTS: fuerza HTTPS durante 1 año, incluye subdominios
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );
    // CSP básica: solo recursos propios + fuentes de datos inline necesarias
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",   // unsafe-inline necesario para Astro islands
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",          // https: permite avatares externos
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );

    return response;
  }
);
