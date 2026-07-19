import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken, isStrongPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";
import { json } from "@/lib/api";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 5 registros por IP cada hora
  const ip = getClientIp(request);
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return rateLimitedResponse(3600);
  }

  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return json({ error: "Todos los campos son obligatorios" }, 400);
    }

    if (!isStrongPassword(password)) {
      return json(
        { error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número" },
        400
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return json({ error: "Ya existe una cuenta con ese correo electrónico" }, 409);
    }

    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateToken();

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: passwordHash,
        emailVerificationToken,
        roleId: 1,
      },
    });

    await sendVerificationEmail(email.toLowerCase().trim(), name.trim(), emailVerificationToken);

    return json({ ok: true });
  } catch (err) {
    console.error("[api/auth/register]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
