import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/utils/readingTime";
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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function applyTags(postId: number, tags: string[]) {
  await prisma.postTag.deleteMany({ where: { postId } });
  for (const name of tags) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tag = await prisma.tag.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
      select: { id: true },
    });
    await prisma.postTag.upsert({
      where: { postId_tagId: { postId, tagId: tag.id } },
      create: { postId, tagId: tag.id },
      update: {},
    });
  }
}

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const body = await request.json();
    const { title, description, content, authorId, tags, draft, coverImage, scheduledAt, metaTitle, canonical } = body;

    if (!title?.trim() || !description?.trim() || !content?.trim()) {
      return json({ error: "Título, descripción y contenido son obligatorios" }, 400);
    }

    const slug = slugify(title);
    const isDraft = draft ?? true;
    const publishedAt = isDraft ? null : scheduledAt ? new Date(scheduledAt) : new Date();

    const post = await prisma.post.create({
      data: {
        slug,
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        authorId: authorId || null,
        draft: isDraft,
        readingTime: calculateReadingTime(content),
        publishedAt,
        coverImage: coverImage?.trim() || null,
        metaTitle: metaTitle?.trim() || null,
        canonical: canonical?.trim() || null,
      },
      select: { id: true, slug: true },
    });

    const tagList: string[] = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (tagList.length > 0) await applyTags(post.id, tagList);
    await logAudit(locals, "CREATE", "post", post.slug, { title });

    return json({ ok: true, slug: post.slug }, 201);
  } catch (err) {
    console.error("[api/admin/posts POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
