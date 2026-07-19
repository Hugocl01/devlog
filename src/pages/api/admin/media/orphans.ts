import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

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
