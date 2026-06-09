import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { hashPassword, isStrongPassword } from "@/lib/auth";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return json({ error: "Token y contraseña son obligatorios" }, 400);
    }

    if (!isStrongPassword(password)) {
      return json(
        { error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número" },
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return json({ error: "El enlace ha expirado o no es válido" }, 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    // Invalida todas las sesiones activas del usuario
    await prisma.session.deleteMany({ where: { userId: user.id } });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/auth/reset-password]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
