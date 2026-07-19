import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";

export const prerender = false;

// GET /api/profile/sessions — list all sessions for the current user
export const GET: APIRoute = async ({ locals, cookies }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  const currentToken = cookies.get("devlog_session")?.value ?? null;

  const sessions = await prisma.session.findMany({
    where: { userId: locals.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true, token: true },
  });

  return json({
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress ? s.ipAddress.replace(/(\d+)$/, "***") : null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentToken,
    })),
  });
};

// DELETE /api/profile/sessions — revoke one session or all except current
export const DELETE: APIRoute = async ({ locals, cookies, request }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  const currentToken = cookies.get("devlog_session")?.value ?? null;
  const { sessionId, all } = await request.json().catch(() => ({}));

  if (all) {
    await prisma.session.deleteMany({
      where: {
        userId: locals.user.id,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    });
    return json({ ok: true });
  }

  if (!sessionId) return json({ error: "sessionId requerido" }, 400);

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: locals.user.id },
  });
  if (!session) return json({ error: "Sesión no encontrada" }, 404);
  if (session.token === currentToken) return json({ error: "No puedes revocar la sesión actual desde aquí. Usa Cerrar sesión." }, 400);

  await prisma.session.delete({ where: { id: sessionId } });
  return json({ ok: true });
};
