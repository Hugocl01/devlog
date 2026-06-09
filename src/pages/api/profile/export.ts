import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const prerender = false;

// GET — descarga todos los datos personales del usuario (Art. 20 RGPD)
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3 exportaciones por usuario cada 24 horas
  if (!checkRateLimit(`export:${user.id}`, 3, 24 * 60 * 60 * 1000)) {
    return rateLimitedResponse(86400);
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        createdAt: true,
        emailVerified: true,
        emailChangePending: true,
        comments: {
          select: {
            id: true,
            content: true,
            deleted: true,
            createdAt: true,
            post: { select: { slug: true, title: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        reactions: {
          select: {
            createdAt: true,
            post: { select: { slug: true, title: true } },
            type: { select: { name: true, emoji: true, label: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        sessions: {
          select: {
            createdAt: true,
            expiresAt: true,
            userAgent: true,
            ipAddress: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!dbUser) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      legalBasis: "Artículo 20 RGPD — Derecho a la portabilidad de los datos",
      profile: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        bio: dbUser.bio ?? null,
        avatar: dbUser.avatar ?? null,
        emailVerified: dbUser.emailVerified,
        pendingEmailChange: dbUser.emailChangePending ?? null,
        memberSince: dbUser.createdAt.toISOString(),
      },
      comments: dbUser.comments.map((c) => ({
        id: c.id,
        content: c.deleted ? "[Comentario eliminado]" : c.content,
        deleted: c.deleted,
        post: c.post ? { slug: c.post.slug, title: c.post.title } : null,
        createdAt: c.createdAt.toISOString(),
      })),
      reactions: dbUser.reactions.map((r) => ({
        post: r.post ? { slug: r.post.slug, title: r.post.title } : null,
        reaction: { name: r.type.name, emoji: r.type.emoji, label: r.type.label },
        createdAt: r.createdAt.toISOString(),
      })),
      sessions: dbUser.sessions.map((s) => ({
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        userAgent: s.userAgent ?? null,
        ipAddress: s.ipAddress ?? null,
      })),
    };

    const filename = `devlog-datos-${dbUser.id}-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/profile/export GET]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
