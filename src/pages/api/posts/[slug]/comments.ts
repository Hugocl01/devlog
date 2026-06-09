import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug!;
  const isAdmin = locals.user?.roleId === 2;

  try {
    const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, draft: true } });
    if (!post || post.draft) return json({ comments: [] });

    const comments = await prisma.comment.findMany({
      where: {
        postId: post.id,
        parentId: null,
        OR: [
          { deleted: false, ...(isAdmin ? {} : { banned: false }) },
          { deleted: true, replies: { some: {} } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, avatar: true, banned: true } },
        replies: {
          where: {
            OR: [
              { deleted: false, ...(isAdmin ? {} : { banned: false }) },
              { deleted: true },
            ],
          },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, avatar: true, banned: true } },
          },
        },
      },
    });

    const sanitized = comments.map((c) => ({
      ...c,
      content: c.deleted ? "" : c.content,
      replies: c.replies.map((r) => ({ ...r, content: r.deleted ? "" : r.content })),
    }));

    return json({ comments: sanitized });
  } catch (err) {
    console.error("[api/posts/comments GET]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const slug = params.slug!;

  if (!locals.user) {
    return json({ error: "Debes iniciar sesión para comentar" }, 401);
  }

  // 5 comentarios por usuario cada 10 minutos
  if (!checkRateLimit(`comment:${locals.user.id}`, 5, 10 * 60 * 1000)) {
    return rateLimitedResponse(600);
  }

  try {
    const { content, parentId } = await request.json();

    if (!content?.trim()) {
      return json({ error: "El comentario no puede estar vacío" }, 400);
    }
    if (content.trim().length > 2000) {
      return json({ error: "El comentario es demasiado largo (máx. 2000 caracteres)" }, 400);
    }

    const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, draft: true } });
    if (!post || post.draft) return json({ error: "Post no encontrado" }, 404);

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== post.id || parent.parentId !== null || parent.deleted) {
        return json({ error: "Comentario padre inválido" }, 400);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: post.id,
        userId: locals.user.id,
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    return json({ comment }, 201);
  } catch (err) {
    console.error("[api/posts/comments POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
