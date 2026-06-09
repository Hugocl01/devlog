import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, isStrongPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function isAdmin(locals: App.Locals) {
  return locals.user?.roleId === 2;
}

// PATCH /api/admin/profile — update name, bio, avatar
export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const body = await request.json();
    const data: { name?: string; bio?: string; avatar?: string | null } = {};

    if ("name" in body) {
      if (!body.name?.trim()) return json({ error: "El nombre no puede estar vacío" }, 400);
      data.name = body.name.trim();
    }
    if ("bio" in body) data.bio = body.bio?.trim() || null;
    if ("avatar" in body) data.avatar = body.avatar?.trim() || null;

    if (Object.keys(data).length === 0) return json({ error: "Nada que actualizar" }, 400);

    const updated = await prisma.user.update({
      where: { id: locals.user!.id },
      data,
      select: { id: true, name: true, email: true, bio: true, avatar: true },
    });

    await logAudit(locals, "UPDATE", "user", locals.user!.id, { fields: Object.keys(data) });

    return json({ ok: true, user: updated });
  } catch (err) {
    console.error("[api/admin/profile PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};

// PUT /api/admin/profile — change password
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return json({ error: "Contraseña actual y nueva son obligatorias" }, 400);
    }
    if (!isStrongPassword(newPassword)) {
      return json({
        error: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número",
      }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: locals.user!.id },
      select: { password: true },
    });
    if (!user) return json({ error: "Usuario no encontrado" }, 404);

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return json({ error: "La contraseña actual no es correcta" }, 400);

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: locals.user!.id }, data: { password: hashed } });
    await logAudit(locals, "UPDATE", "user", locals.user!.id, { fields: ["password"] });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/profile PUT]", err);
    return json({ error: "Error interno" }, 500);
  }
};
