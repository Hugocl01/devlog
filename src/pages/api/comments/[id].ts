import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";

export const prerender = false;

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const id = params.id!;

  if (!locals.user) return json({ error: "No autorizado" }, 401);

  try {
    const { content } = await request.json();

    if (!content?.trim()) return json({ error: "El contenido no puede estar vacío" }, 400);
    if (content.trim().length > 2000) return json({ error: "El comentario es demasiado largo (máx. 2000 caracteres)" }, 400);

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.deleted) return json({ error: "Comentario no encontrado" }, 404);
    if (comment.userId !== locals.user.id) return json({ error: "Solo puedes editar tus propios comentarios" }, 403);

    const elapsed = Date.now() - comment.createdAt.getTime();
    if (elapsed > EDIT_WINDOW_MS) return json({ error: "El tiempo para editar ha expirado (15 min)" }, 403);

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: content.trim() },
      select: { id: true, content: true, updatedAt: true },
    });

    return json({ ok: true, comment: updated });
  } catch (err) {
    console.error("[api/comments/patch]", err);
    return json({ error: "Error interno" }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id = params.id!;

  if (!locals.user) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) return json({ error: "Comentario no encontrado" }, 404);

    const isOwner = comment.userId === locals.user.id;
    const isAdmin = locals.user.roleId === 2;

    if (!isOwner && !isAdmin) {
      return json({ error: "No tienes permiso para eliminar este comentario" }, 403);
    }

    await prisma.comment.update({
      where: { id },
      data: { deleted: true, content: "" },
    });

    return json({ ok: true });
  } catch (err) {
    console.error("[api/comments/delete]", err);
    return json({ error: "Error interno" }, 500);
  }
};
