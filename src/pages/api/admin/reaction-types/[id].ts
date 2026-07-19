import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = parseInt(params.id!, 10);
  if (isNaN(id)) return json({ error: "ID inválido" }, 400);

  try {
    const { name, emoji, label } = await request.json();
    const data: { name?: string; emoji?: string; label?: string } = {};
    if (name?.trim()) data.name = name.trim().toUpperCase();
    if (emoji?.trim()) data.emoji = emoji.trim();
    if (label?.trim()) data.label = label.trim();

    const type = await prisma.reactionType.update({ where: { id }, data });

    await logAudit(locals, "UPDATE", "reaction_type", String(id), data);

    return json({ ok: true, type });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return json({ error: "No encontrado" }, 404);
    if ((err as { code?: string }).code === "P2002") return json({ error: "Ya existe un tipo con ese nombre" }, 409);
    console.error("[api/admin/reaction-types PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = parseInt(params.id!, 10);
  if (isNaN(id)) return json({ error: "ID inválido" }, 400);

  try {
    const count = await prisma.reaction.count({ where: { typeId: id } });
    if (count > 0) {
      return json({ error: `No se puede eliminar: hay ${count} reacción${count !== 1 ? "es" : ""} de este tipo` }, 409);
    }

    await prisma.reactionType.delete({ where: { id } });
    await logAudit(locals, "DELETE", "reaction_type", String(id));

    return json({ ok: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return json({ error: "No encontrado" }, 404);
    console.error("[api/admin/reaction-types DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
