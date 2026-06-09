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

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const [allMedia, posts, updates] = await Promise.all([
    prisma.media.findMany({ select: { id: true, url: true } }),
    prisma.post.findMany({ select: { coverImage: true, content: true } }),
    prisma.update.findMany({ select: { content: true } }),
  ]);

  // Build a single string with all content to check references
  const allContent = [
    ...posts.map((p) => `${p.coverImage ?? ""} ${p.content}`),
    ...updates.map((u) => u.content),
  ].join("\n");

  const orphanIds = allMedia
    .filter((m) => !allContent.includes(m.url))
    .map((m) => m.id);

  return json({ orphanIds });
};
