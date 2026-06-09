import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (locals.user?.roleId !== 2) return json({ error: "No autorizado" }, 403);

  const userId = params.id!;

  try {
    const { count } = await prisma.session.deleteMany({ where: { userId } });
    return json({ ok: true, count });
  } catch (err) {
    console.error("[api/admin/users/sessions DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
