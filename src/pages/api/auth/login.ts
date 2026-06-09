import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createJWT, DUMMY_HASH } from "@/lib/auth";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  // 10 intentos por IP cada 15 minutos
  const ip = getClientIp(request);
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return rateLimitedResponse(900);
  }

  try {
    const body = await request.json();
    const { email, password, remember } = body;

    if (!email?.trim() || !password) {
      return json({ error: "Correo y contraseña son obligatorios" }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Siempre ejecuta bcrypt para evitar timing attacks por enumeración de emails
    const hashToCheck = user?.password ?? DUMMY_HASH;
    const passwordValid = await verifyPassword(password, hashToCheck);

    if (!user || !passwordValid) {
      // Si el usuario existe pero sólo tiene cuenta OAuth, dar aviso específico
      if (user && !user.password) {
        return json(
          { error: "Esta cuenta usa GitHub para iniciar sesión. Usa el botón de GitHub.", code: "OAUTH_ONLY" },
          401
        );
      }
      return json({ error: "Credenciales incorrectas" }, 401);
    }

    if (!user.emailVerified) {
      return json(
        { error: "Debes verificar tu correo antes de iniciar sesión", code: "EMAIL_NOT_VERIFIED" },
        403
      );
    }

    if (user.banned) {
      return json({ error: "Esta cuenta ha sido suspendida", code: "ACCOUNT_BANNED" }, 403);
    }

    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const jwtExpiry = remember ? "30d" : "7d";
    const token = createJWT(user.id, jwtExpiry);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + maxAge * 1000),
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    cookies.set("devlog_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("[api/auth/login]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
