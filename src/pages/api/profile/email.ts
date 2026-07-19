import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { sendEmailChangeEmail } from "@/lib/email";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";
import { json } from "@/lib/api";

export const prerender = false;

// POST — solicita el cambio de email
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return json({ error: "No autenticado" }, 401);

  // 3 solicitudes por usuario cada hora
  const ip = getClientIp(request);
  if (!checkRateLimit(`email-change:${user.id}:${ip}`, 3, 60 * 60 * 1000)) {
    return rateLimitedResponse(3600);
  }

  let newEmail: string;
  let password: string | undefined;

  try {
    ({ newEmail, password } = await request.json());
  } catch {
    return json({ error: "Cuerpo de solicitud inválido" }, 400);
  }

  if (!newEmail?.trim()) return json({ error: "El nuevo email es obligatorio" }, 400);

  const normalized = newEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) return json({ error: "El formato del email no es válido" }, 400);

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true, email: true },
    });
    if (!dbUser) return json({ error: "Usuario no encontrado" }, 404);

    if (normalized === dbUser.email.toLowerCase()) {
      return json({ error: "El nuevo email coincide con el actual" }, 400);
    }

    // Usuarios con contraseña deben confirmarla; usuarios OAuth (sin contraseña)
    // están autenticados por sesión activa, lo que es suficiente.
    if (dbUser.password) {
      if (!password) return json({ error: "La contraseña es obligatoria" }, 400);
      const valid = await verifyPassword(password, dbUser.password);
      if (!valid) return json({ error: "Contraseña incorrecta" }, 400);
    }

    const taken = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (taken) return json({ error: "Este email ya está en uso" }, 409);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.update({
      where: { id: user.id },
      data: { emailChangePending: normalized, emailChangeToken: token, emailChangeExpiresAt: expiresAt },
    });

    await sendEmailChangeEmail(normalized, user.name, token);

    return json({ ok: true });
  } catch (err) {
    console.error("[api/profile/email POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
