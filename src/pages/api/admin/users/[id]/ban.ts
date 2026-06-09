import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
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

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = params.id!;
  if (id === locals.user!.id) return json({ error: "No puedes banearte a ti mismo" }, 400);

  try {
    const { banned } = await request.json() as { banned: boolean };
    if (typeof banned !== "boolean") return json({ error: "Campo banned requerido (boolean)" }, 400);

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, roleId: true } });
    if (!existing) return json({ error: "Usuario no encontrado" }, 404);
    if (existing.roleId === 2) return json({ error: "No se puede banear a un administrador" }, 400);

    const updated = await prisma.user.update({
      where: { id },
      data: { banned, bannedAt: banned ? new Date() : null },
      select: { id: true, banned: true, bannedAt: true },
    });

    // Cerrar todas las sesiones activas si se banea
    if (banned) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await logAudit(locals, banned ? "BAN" : "UNBAN", "user", id);

    return json({ ok: true, user: updated });
  } catch (err) {
    console.error("[api/admin/users/ban PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};
