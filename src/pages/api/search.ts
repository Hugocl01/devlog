import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitedResponse, getClientIp } from "@/lib/rate-limit";
import { tagUrl } from "@/utils/tag";
import { json } from "@/lib/api";

export const prerender = false;

function buildExcerpt(text: string, query: string, maxLen = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 100);
  const slice = text.slice(start, end);
  // Resalta el término buscado con <mark>
  const highlighted = slice.replace(
    new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    (m) => `<mark class="bg-primary/20 text-foreground rounded px-0.5">${m}</mark>`
  );
  return (start > 0 ? "…" : "") + highlighted + (end < text.length ? "…" : "");
}

export const GET: APIRoute = async ({ url, request }) => {
  const ip = getClientIp(request);
  if (!checkRateLimit(`search:${ip}`, 60, 60 * 1000)) {
    return rateLimitedResponse(60);
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return json({ results: [] });
  if (q.length > 100) return json({ results: [] });

  const now = new Date();
  const publishedFilter = { draft: false, publishedAt: { lte: now } };

  try {
    const [posts, updates, tags] = await Promise.all([
      prisma.post.findMany({
        where: {
          ...publishedFilter,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { slug: true, title: true, description: true, content: true, coverImage: true },
        take: 6,
        orderBy: { publishedAt: "desc" },
      }),
      prisma.update.findMany({
        where: {
          ...publishedFilter,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { slug: true, title: true, description: true, content: true },
        take: 3,
        orderBy: { publishedAt: "desc" },
      }),
      prisma.tag.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: {
          name: true,
          color: true,
          _count: { select: { posts: true } },
        },
        take: 4,
        orderBy: { name: "asc" },
      }),
    ]);

    const results = [
      ...posts.map((p) => ({
        url: `/blog/${p.slug}/`,
        title: p.title,
        excerpt: buildExcerpt(p.description + " " + p.content, q),
        image: p.coverImage ?? undefined,
        type: "post" as const,
      })),
      ...updates.map((u) => ({
        url: `/updates/${u.slug}/`,
        title: u.title,
        excerpt: buildExcerpt(u.description + " " + u.content, q),
        type: "update" as const,
      })),
      ...tags.map((t) => ({
        url: `/tags/${tagUrl(t.name)}/`,
        title: t.name,
        excerpt: `${t._count.posts} post${t._count.posts !== 1 ? "s" : ""} con esta etiqueta`,
        color: t.color ?? undefined,
        type: "tag" as const,
      })),
    ].slice(0, 10);

    return json({ results });
  } catch (err) {
    console.error("[api/search]", err);
    return json({ results: [] });
  }
};
