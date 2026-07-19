import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, isStrongPassword } from "@/lib/auth";
import { json } from "@/lib/api";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword) {
      return json({ error: "La nueva contraseña es obligatoria" }, 400);
    }

    if (!isStrongPassword(newPassword)) {
      return json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número" },
        400
      );
    }

    const user = await prisma.user.findUnique({ where: { id: locals.user.id } });
    if (!user) return json({ error: "Usuario no encontrado" }, 404);

    if (user.password) {
      // Cambio de contraseña — requiere la contraseña actual
      if (!currentPassword) {
        return json({ error: "La contraseña actual es obligatoria" }, 400);
      }
      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) return json({ error: "La contraseña actual es incorrecta" }, 400);
    }
    // Si !user.password, es una cuenta OAuth estableciendo contraseña por primera vez

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/profile/password POST]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
