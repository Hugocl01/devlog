import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function isAdmin(locals: App.Locals) {
  return locals.user?.roleId === 2;
}

function pct(current: number, previous: number): { value: number; label: string } | null {
  if (previous === 0) return current > 0 ? { value: 100, label: "+100%" } : null;
  const v = Math.round(((current - previous) / previous) * 100);
  return { value: v, label: v > 0 ? `+${v}%` : `${v}%` };
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const now = Date.now();
  const weekAgo     = new Date(now - 7  * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const [
    posts,
    users,
    comments,
    reactions,
    newPostsNow,
    newPostsPrev,
    newUsersNow,
    newUsersPrev,
    newCommentsNow,
    newCommentsPrev,
    newReactionsNow,
    newReactionsPrev,
  ] = await Promise.all([
    prisma.post.count({ where: { draft: false } }),
    prisma.user.count(),
    prisma.comment.count({ where: { deleted: false } }),
    prisma.reaction.count(),
    prisma.post.count({ where: { draft: false, publishedAt: { gte: weekAgo } } }),
    prisma.post.count({ where: { draft: false, publishedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.comment.count({ where: { deleted: false, createdAt: { gte: weekAgo } } }),
    prisma.comment.count({ where: { deleted: false, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.reaction.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.reaction.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ]);

  return json({
    stats: [
      { key: "posts",     label: "Posts publicados", value: posts,     trend: pct(newPostsNow,     newPostsPrev)     },
      { key: "users",     label: "Usuarios",          value: users,     trend: pct(newUsersNow,     newUsersPrev)     },
      { key: "comments",  label: "Comentarios",       value: comments,  trend: pct(newCommentsNow,  newCommentsPrev)  },
      { key: "reactions", label: "Reacciones",        value: reactions, trend: pct(newReactionsNow, newReactionsPrev) },
    ],
    fetchedAt: new Date().toISOString(),
  });
};
