import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";
import { slugify } from "@/utils/slug";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = parseInt(params.id!);
  if (isNaN(id)) return json({ error: "ID inválido" }, 400);

  try {
    const body = await request.json();
    const data: { name?: string; slug?: string; color?: string | null } = {};

    if ("name" in body) {
      if (!body.name?.trim()) return json({ error: "El nombre no puede estar vacío" }, 400);
      data.name = body.name.trim();
      data.slug = slugify(data.name);
    }
    if ("slug" in body && body.slug?.trim()) {
      const customSlug = slugify(body.slug.trim());
      if (!customSlug) return json({ error: "El slug no es válido" }, 400);
      data.slug = customSlug;
    }
    if ("color" in body) {
      data.color = body.color?.trim() || null;
    }

    if (Object.keys(data).length === 0) return json({ error: "Nada que actualizar" }, 400);

    const updated = await prisma.tag.update({
      where: { id },
      data,
      select: { id: true, name: true, slug: true, color: true, _count: { select: { posts: true } } },
    });

    await logAudit(locals, "UPDATE", "tag", String(id), data);
    return json({ ok: true, tag: updated });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") return json({ error: "Etiqueta no encontrada" }, 404);
    if ((err as { code?: string }).code === "P2002") return json({ error: "Ya existe una etiqueta con ese nombre" }, 409);
    console.error("[api/admin/tags PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = parseInt(params.id!);
  if (isNaN(id)) return json({ error: "ID inválido" }, 400);

  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tag) return json({ error: "Etiqueta no encontrada" }, 404);

    // PostTag tiene onDelete: Cascade — las relaciones se eliminan automáticamente
    await prisma.tag.delete({ where: { id } });
    await logAudit(locals, "DELETE", "tag", String(id));
    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/tags DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
