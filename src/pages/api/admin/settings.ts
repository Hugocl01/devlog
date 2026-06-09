import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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

  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  return json({ settings });
};

export const PUT: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const { updates } = await request.json() as { updates: { key: string; value: string }[] };

    if (!Array.isArray(updates)) return json({ error: "Se esperaba un array de updates" }, 400);

    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.siteSetting.update({ where: { key }, data: { value } })
      )
    );

    await logAudit(locals, "UPDATE", "setting", undefined, { keys: updates.map((u) => u.key) });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/settings PUT]", err);
    return json({ error: "Error interno" }, 500);
  }
};
