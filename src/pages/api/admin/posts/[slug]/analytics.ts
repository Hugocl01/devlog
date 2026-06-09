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

export const GET: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      views: {
        select: { viewedAt: true, country: true },
        orderBy: { viewedAt: "asc" },
      },
      _count: { select: { comments: true, reactions: true, views: true } },
    },
  });

  if (!post) return json({ error: "Post no encontrado" }, 404);

  // Views grouped by day (last 30 days)
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

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

  // Country breakdown
  const countryMap: Record<string, number> = {};
  for (const v of post.views) {
    const c = v.country ?? "Desconocido";
    countryMap[c] = (countryMap[c] ?? 0) + 1;
  }
  const countryBreakdown = Object.entries(countryMap)
    .map(([country, views]) => ({ country, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return json({
    title: post.title,
    totalViews: post._count.views,
    comments: post._count.comments,
    reactions: post._count.reactions,
    dailyViews,
    countryBreakdown,
  });
};
