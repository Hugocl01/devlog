import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/utils/readingTime";
import { json, isAdmin } from "@/lib/api";
import { slugify } from "@/utils/slug";

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const body = await request.json();
    const { title, description, content, authorId, type, draft, scheduledAt, metaTitle, canonical } = body;

    if (!title?.trim() || !description?.trim() || !content?.trim()) {
      return json({ error: "Título, descripción y contenido son obligatorios" }, 400);
    }

    const typeName = type ?? "general";
    const updateType = await prisma.updateType.findUnique({ where: { name: typeName } });
    if (!updateType) return json({ error: `Tipo de update desconocido: ${typeName}` }, 400);

    const slug = slugify(title, 60);
    const isDraft = draft ?? true;
    const publishedAt = isDraft ? null : scheduledAt ? new Date(scheduledAt) : new Date();

    const update = await prisma.update.create({
      data: {
        slug,
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        authorId: authorId || null,
        draft: isDraft,
        readingTime: calculateReadingTime(content),
        publishedAt,
        typeId: updateType.id,
        metaTitle: metaTitle?.trim() || null,
        canonical: canonical?.trim() || null,
      },
      select: { slug: true },
    });

    return json({ ok: true, slug: update.slug }, 201);
  } catch (err) {
    console.error("[api/admin/updates POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
