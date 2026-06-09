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

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      _count: { select: { posts: true } },
    },
  });

  return json({ tags });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const { name, color, slug: customSlug } = await request.json();
    if (!name?.trim()) return json({ error: "El nombre es obligatorio" }, 400);

    const slug = customSlug?.trim() ? slugify(customSlug.trim()) : slugify(name.trim());
    if (!slug) return json({ error: "El slug no es válido" }, 400);

    const existing = await prisma.tag.findFirst({ where: { OR: [{ name: name.trim() }, { slug }] } });
    if (existing) return json({ error: "Ya existe una etiqueta con ese nombre" }, 409);

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        slug,
        color: color?.trim() || null,
      },
      select: { id: true, name: true, slug: true, color: true, _count: { select: { posts: true } } },
    });

    return json({ ok: true, tag }, 201);
  } catch (err) {
    console.error("[api/admin/tags POST]", err);
    return json({ error: "Error interno" }, 500);
  }
};
