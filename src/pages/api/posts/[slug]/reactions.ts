import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function buildReactionList(postId: number, userId?: string) {
  const [types, counts, userReactions] = await Promise.all([
    prisma.reactionType.findMany({ orderBy: { id: "asc" } }),
    prisma.reaction.groupBy({
      by: ["typeId"],
      where: { postId },
      _count: { id: true },
    }),
    userId
      ? prisma.reaction.findMany({
          where: { postId, userId },
          select: { typeId: true },
        })
      : [],
  ]);

  const userReactedSet = new Set(userReactions.map((r) => r.typeId));
  const countMap = new Map(counts.map((c) => [c.typeId, c._count.id]));

  return types.map((t) => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    label: t.label,
    count: countMap.get(t.id) ?? 0,
    userReacted: userReactedSet.has(t.id),
  }));
}

async function emptyReactionList() {
  const types = await prisma.reactionType.findMany({ orderBy: { id: "asc" } });
  return types.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji, label: t.label, count: 0, userReacted: false }));
}

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug!;
  try {
    const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, draft: true } });

    if (!post || post.draft) {
      return json({ reactions: await emptyReactionList() });
    }

    const reactions = await buildReactionList(post.id, locals.user?.id);
    return json({ reactions });
  } catch (err) {
    console.error("[api/posts/reactions GET]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const slug = params.slug!;

  if (!locals.user) {
    return json({ error: "Debes iniciar sesión para reaccionar" }, 401);
  }

  // 30 reacciones por usuario por minuto
  if (!checkRateLimit(`reaction:${locals.user.id}`, 30, 60 * 1000)) {
    return rateLimitedResponse(60);
  }

  try {
    const { typeId } = await request.json();
    if (typeof typeId !== "number" || !Number.isInteger(typeId) || typeId < 1) {
      return json({ error: "Tipo de reacción inválido" }, 400);
    }

    const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, draft: true } });
    if (!post || post.draft) return json({ error: "Post no encontrado" }, 404);

    const existing = await prisma.reaction.findUnique({
      where: { postId_userId_typeId: { postId: post.id, userId: locals.user.id, typeId } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { postId: post.id, userId: locals.user.id, typeId },
      });
    }

    const reactions = await buildReactionList(post.id, locals.user.id);
    return json({ reactions });
  } catch (err) {
    console.error("[api/posts/reactions POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
