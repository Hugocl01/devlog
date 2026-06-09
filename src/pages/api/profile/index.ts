import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  try {
    const { name, bio, avatar } = await request.json();

    const updates: Record<string, string | null> = {};

    if (name !== undefined) {
      const trimmed = name?.trim() ?? "";
      if (!trimmed) return json({ error: "El nombre no puede estar vacío" }, 400);
      if (trimmed.length > 100) return json({ error: "El nombre es demasiado largo" }, 400);
      updates.name = trimmed;
    }

    if (bio !== undefined) {
      const trimmed = bio?.trim() ?? "";
      if (trimmed.length > 500) return json({ error: "La bio es demasiado larga (máx. 500 caracteres)" }, 400);
      updates.bio = trimmed || null;
    }

    if (avatar !== undefined) {
      const trimmed = avatar?.trim() ?? "";
      if (trimmed) {
        if (trimmed.length > 512) return json({ error: "La URL del avatar es demasiado larga" }, 400);
        if (!trimmed.startsWith("/uploads/")) {
          try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
              return json({ error: "La URL del avatar debe usar http o https" }, 400);
            }
          } catch {
            return json({ error: "La URL del avatar no es válida" }, 400);
          }
        }
      }
      updates.avatar = trimmed || null;
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: "No hay cambios que guardar" }, 400);
    }

    const updated = await prisma.user.update({
      where: { id: locals.user.id },
      data: updates,
      select: { id: true, name: true, email: true, avatar: true, bio: true, roleId: true },
    });

    return json({ ok: true, user: updated });
  } catch (err) {
    console.error("[api/profile PATCH]", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
};
