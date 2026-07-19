import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { json } from "@/lib/api";

export const prerender = false;

// Rate limiting en memoria: email -> timestamp último envío
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 1 minuto

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email?.trim()) {
      return json({ error: "El correo electrónico es obligatorio" }, 400);
    }

    const emailKey = email.toLowerCase().trim();

    const last = lastSent.get(emailKey);
    if (last && Date.now() - last < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
      return json({ error: `Espera ${remaining}s antes de volver a enviar` }, 429);
    }

    const user = await prisma.user.findUnique({ where: { email: emailKey } });

    // No revelar si el email existe; solo reenviar si está pendiente de verificar
    if (user && !user.emailVerified) {
      const token = generateToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationToken: token },
      });
      await sendVerificationEmail(emailKey, user.name, token);
      lastSent.set(emailKey, Date.now());
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[api/auth/resend-verification]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
