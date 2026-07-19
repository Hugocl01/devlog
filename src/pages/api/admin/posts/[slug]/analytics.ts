import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  // Calculate date range first so it can be used in the query
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      views: {
        where: { viewedAt: { gte: since } },
        select: { viewedAt: true },
        orderBy: { viewedAt: "asc" },
      },
      _count: { select: { comments: true, reactions: true, views: true } },
    },
  });

  if (!post) return json({ error: "Post no encontrado" }, 404);

  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }

  for (const v of post.views) {
    const day = v.viewedAt.toISOString().slice(0, 10);
    if (day in dailyMap) dailyMap[day]++;
  }

  const dailyViews = Object.entries(dailyMap).map(([date, views]) => ({ date, views }));

  return json({
    title: post.title,
    totalViews: post._count.views,
    comments: post._count.comments,
    reactions: post._count.reactions,
    dailyViews,
  });
};
