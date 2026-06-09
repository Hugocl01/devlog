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

  const update = await prisma.update.findUnique({
    where: { slug },
    select: {
      title: true,
      views: {
        select: { viewedAt: true },
        orderBy: { viewedAt: "asc" },
      },
      _count: { select: { views: true } },
    },
  });

  if (!update) return json({ error: "Update no encontrado" }, 404);

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }

  for (const v of update.views) {
    const day = v.viewedAt.toISOString().slice(0, 10);
    if (day in dailyMap) dailyMap[day]++;
  }

  const dailyViews = Object.entries(dailyMap).map(([date, views]) => ({ date, views }));

  return json({
    title: update.title,
    totalViews: update._count.views,
    dailyViews,
  });
};
