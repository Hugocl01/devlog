import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/utils/readingTime";
import { logAudit } from "@/lib/audit";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  try {
    const body = await request.json();
    if (typeof body.draft !== "boolean") return json({ error: "Campo 'draft' requerido (boolean)" }, 400);

    const existing = await prisma.update.findUnique({ where: { slug }, select: { draft: true } });
    if (!existing) return json({ error: "Update no encontrado. Ejecuta el script de sincronización primero." }, 404);

    const publishedAt =
      !body.draft && existing.draft
        ? new Date()
        : body.draft
          ? null
          : undefined;

    const updated = await prisma.update.update({
      where: { slug },
      data: {
        draft: body.draft,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
      select: { slug: true, draft: true, publishedAt: true },
    });

    await logAudit(locals, body.draft ? "UNPUBLISH" : "PUBLISH", "update", slug);

    return json({ ok: true, update: updated });
  } catch (err) {
    console.error("[api/admin/updates PATCH]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  try {
    const existing = await prisma.update.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return json({ error: "Update no encontrado" }, 404);

    await prisma.update.delete({ where: { slug } });
    await logAudit(locals, "DELETE", "update", slug);
    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/updates DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const PUT: APIRoute = async ({ params, locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  try {
    const body = await request.json();
    const { title, description, content, authorId, type, draft, scheduledAt, metaTitle, canonical } = body;

    if (!title?.trim() || !description?.trim() || !content?.trim()) {
      return json({ error: "Título, descripción y contenido son obligatorios" }, 400);
    }

    const existing = await prisma.update.findUnique({ where: { slug }, select: { draft: true } });
    if (!existing) return json({ error: "Update no encontrado" }, 404);

    const typeName = type ?? "general";
    const updateType = await prisma.updateType.findUnique({ where: { name: typeName } });
    if (!updateType) return json({ error: `Tipo desconocido: ${typeName}` }, 400);

    const isDraft = draft ?? existing.draft;
    let publishedAt: Date | null | undefined;
    if (isDraft) {
      publishedAt = null;
    } else if (scheduledAt) {
      publishedAt = new Date(scheduledAt);
    } else if (existing.draft) {
      publishedAt = new Date();
    } else {
      publishedAt = undefined;
    }

    const updated = await prisma.update.update({
      where: { slug },
      data: {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        authorId: authorId || null,
        draft: isDraft,
        readingTime: calculateReadingTime(content),
        typeId: updateType.id,
        metaTitle: metaTitle?.trim() || null,
        canonical: canonical?.trim() || null,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
      select: { slug: true },
    });

    await logAudit(locals, "UPDATE", "update", slug, { title });

    return json({ ok: true, slug: updated.slug });
  } catch (err) {
    console.error("[api/admin/updates PUT]", err);
    return json({ error: "Error interno" }, 500);
  }
};
