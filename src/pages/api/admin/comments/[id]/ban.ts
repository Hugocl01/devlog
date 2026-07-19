import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

// PATCH — toggle ban on a single comment
export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = params.id!;

  try {
    const { banned } = await request.json() as { banned: boolean };
    if (typeof banned !== "boolean") return json({ error: "Campo banned requerido (boolean)" }, 400);

    const existing = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return json({ error: "Comentario no encontrado" }, 404);

    const updated = await prisma.comment.update({
      where: { id },
      data: { banned },
      select: { id: true, banned: true },
    });

    await logAudit(locals, banned ? "BAN" : "UNBAN", "comment", id);

    return json({ ok: true, comment: updated });
  } catch (err) {
    console.error("[api/admin/comments/ban PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};
