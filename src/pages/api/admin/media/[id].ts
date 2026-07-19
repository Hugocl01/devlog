import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const id = parseInt(params.id!, 10);
  if (isNaN(id)) return json({ error: "ID inválido" }, 400);

  try {
    const media = await prisma.media.findUnique({ where: { id }, select: { id: true, filename: true } });
    if (!media) return json({ error: "Archivo no encontrado" }, 404);

    // Remove from disk (non-fatal if already deleted)
    try {
      await unlink(join(process.cwd(), "public", "uploads", media.filename));
    } catch {
      // File may already be gone
    }

    await prisma.media.delete({ where: { id } });
    await logAudit(locals, "DELETE", "media", String(id), { filename: media.filename });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/admin/media DELETE]", err);
    return json({ error: "Error interno" }, 500);
  }
};
