import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";
import { json } from "@/lib/api";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 5 solicitudes por IP cada hora (evita spam de emails de reset)
  const ip = getClientIp(request);
  if (!checkRateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000)) {
    return rateLimitedResponse(3600);
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email?.trim()) {
      return json({ error: "El correo electrónico es obligatorio" }, 400);
    }

    // Siempre devuelve éxito para no revelar si el email existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      const token = generateToken();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        },
      });

      await sendPasswordResetEmail(user.email, user.name, token);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[api/auth/forgot-password]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
