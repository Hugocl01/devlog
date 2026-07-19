import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const { ids, banned } = await request.json() as { ids: string[]; banned: boolean };

    if (!Array.isArray(ids) || ids.length === 0) return json({ error: "Se requiere un array de ids" }, 400);
    if (typeof banned !== "boolean") return json({ error: "Campo banned requerido (boolean)" }, 400);

    const { count } = await prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { banned },
    });

    await logAudit(locals, banned ? "BAN" : "UNBAN", "comment", undefined, { ids, count });

    return json({ ok: true, count });
  } catch (err) {
    console.error("[api/admin/comments/bulk-ban PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};
