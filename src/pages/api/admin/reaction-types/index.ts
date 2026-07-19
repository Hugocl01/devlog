import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const types = await prisma.reactionType.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { reactions: true } } },
  });

  return json({ types });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const { name, emoji, label } = await request.json();

    if (!name?.trim() || !emoji?.trim() || !label?.trim()) {
      return json({ error: "name, emoji y label son obligatorios" }, 400);
    }

    const type = await prisma.reactionType.create({
      data: { name: name.trim().toUpperCase(), emoji: emoji.trim(), label: label.trim() },
    });

    await logAudit(locals, "CREATE", "reaction_type", String(type.id), { name: type.name });

    return json({ ok: true, type }, 201);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") return json({ error: "Ya existe un tipo con ese nombre" }, 409);
    console.error("[api/admin/reaction-types POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
