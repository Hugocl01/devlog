import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// DELETE /api/profile/delete — anonymize and effectively delete user account
export const DELETE: APIRoute = async ({ locals, cookies, request }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  const { password } = await request.json().catch(() => ({}));

  const user = await prisma.user.findUnique({ where: { id: locals.user.id } });
  if (!user) return json({ error: "Usuario no encontrado" }, 404);

  if (user.password) {
    if (!password) return json({ error: "La contraseña es obligatoria para confirmar" }, 400);
    const valid = await verifyPassword(password, user.password);
    if (!valid) return json({ error: "La contraseña no es correcta" }, 400);
  }

  // Anonymize: soft-delete comments to preserve thread structure, then remove PII
  await prisma.$transaction([
    // Mark all comments as deleted to preserve reply threads
    prisma.comment.updateMany({
      where: { userId: user.id },
      data: { deleted: true, content: "[Comentario eliminado]" },
    }),
    // Delete reactions — no structural dependency
    prisma.reaction.deleteMany({ where: { userId: user.id } }),
    // Delete all sessions — invalidates all active logins
    prisma.session.deleteMany({ where: { userId: user.id } }),
    // Overwrite all PII fields; keep the record as a placeholder for comment threads
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Usuario eliminado",
        email: `deleted_${user.id}@deleted.invalid`,
        password: "DELETED",
        emailVerified: false,
        emailVerificationToken: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        emailChangePending: null,
        emailChangeToken: null,
        emailChangeExpiresAt: null,
        avatar: null,
        bio: null,
      },
    }),
  ]);

  // Clear the session cookie
  cookies.delete("devlog_session", { path: "/" });

  return json({ ok: true });
};
