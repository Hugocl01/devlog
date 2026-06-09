import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/utils/readingTime";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function isAdmin(locals: App.Locals) {
  return locals.user?.roleId === 2;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

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

    const slug = slugify(title);
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
