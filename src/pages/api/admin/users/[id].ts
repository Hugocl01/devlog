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
  if (id === locals.user!.id) return json({ error: "No puedes modificar tu propio rol" }, 400);

  try {
    const { roleId } = await request.json();
    if (typeof roleId !== "number") return json({ error: "roleId inválido" }, 400);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return json({ error: "Rol no encontrado" }, 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId },
      select: { id: true, name: true, email: true, roleId: true, role: { select: { name: true } } },
    });

    await logAudit(locals, "UPDATE", "user", id, { roleId });
    return json({ ok: true, user: updated });
  } catch (err) {
    console.error("[api/admin/users PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = params.id!;
  if (id === locals.user!.id) return json({ error: "No puedes eliminar tu propia cuenta desde aquí" }, 400);

  try {
    await prisma.user.delete({ where: { id } });
    await logAudit(locals, "DELETE", "user", id);
    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
