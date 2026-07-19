import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

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
    updates,
    users,
    comments,
    reactions,
    newPostsNow,
    newPostsPrev,
    newUpdatesNow,
    newUpdatesPrev,
    newUsersNow,
    newUsersPrev,
    newCommentsNow,
    newCommentsPrev,
    newReactionsNow,
    newReactionsPrev,
  ] = await Promise.all([
    prisma.post.count({ where: { draft: false } }),
    prisma.update.count({ where: { draft: false } }),
    prisma.user.count(),
    prisma.comment.count({ where: { deleted: false } }),
    prisma.reaction.count(),
    prisma.post.count({ where: { draft: false, publishedAt: { gte: weekAgo } } }),
    prisma.post.count({ where: { draft: false, publishedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.update.count({ where: { draft: false, publishedAt: { gte: weekAgo } } }),
    prisma.update.count({ where: { draft: false, publishedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.comment.count({ where: { deleted: false, createdAt: { gte: weekAgo } } }),
    prisma.comment.count({ where: { deleted: false, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.reaction.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.reaction.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ]);

  return json({
    stats: [
      { key: "posts",     label: "Posts publicados",   value: posts,     trend: pct(newPostsNow,     newPostsPrev)     },
      { key: "updates",   label: "Updates publicados", value: updates,   trend: pct(newUpdatesNow,   newUpdatesPrev)   },
      { key: "users",     label: "Usuarios",           value: users,     trend: pct(newUsersNow,     newUsersPrev)     },
      { key: "comments",  label: "Comentarios",        value: comments,  trend: pct(newCommentsNow,  newCommentsPrev)  },
      { key: "reactions", label: "Reacciones",         value: reactions, trend: pct(newReactionsNow, newReactionsPrev) },
    ],
    fetchedAt: new Date().toISOString(),
  });
};
