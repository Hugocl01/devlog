import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const userId = params.id!;

  try {
    const { count } = await prisma.session.deleteMany({ where: { userId } });
    return json({ ok: true, count });
  } catch (err) {
    console.error("[api/admin/users/sessions DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
