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

export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ results: [] });

  const [posts, updates, users, tags] = await Promise.all([
    prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { slug: true, title: true, draft: true },
      take: 5,
    }),
    prisma.update.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { slug: true, title: true, draft: true },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 5,
    }),
    prisma.tag.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, color: true },
      take: 5,
    }),
  ]);

  const results = [
    ...posts.map((p) => ({
      type: "post" as const,
      id: p.slug,
      label: p.title,
      sublabel: p.draft ? "Borrador" : "Publicado",
      href: `/admin/posts/${p.slug}/edit`,
    })),
    ...updates.map((u) => ({
      type: "update" as const,
      id: u.slug,
      label: u.title,
      sublabel: u.draft ? "Borrador" : "Publicado",
      href: `/admin/updates/${u.slug}/edit`,
    })),
    ...users.map((u) => ({
      type: "user" as const,
      id: u.id,
      label: u.name,
      sublabel: u.email,
      href: `/admin/users/${u.id}`,
    })),
    ...tags.map((t) => ({
      type: "tag" as const,
      id: String(t.id),
      label: t.name,
      sublabel: t.slug,
      href: `/admin/tags/${t.id}`,
      color: t.color,
    })),
  ];

  return json({ results });
};
