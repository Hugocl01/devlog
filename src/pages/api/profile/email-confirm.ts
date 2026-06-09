import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

// GET — confirma el cambio de email via token en query param
export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get("token");
  if (!token) return redirect("/profile?email_change=invalid");

  try {
    const dbUser = await prisma.user.findUnique({
      where: { emailChangeToken: token },
      select: { id: true, emailChangePending: true, emailChangeExpiresAt: true },
    });

    if (!dbUser || !dbUser.emailChangePending) return redirect("/profile?email_change=invalid");
    if (dbUser.emailChangeExpiresAt && dbUser.emailChangeExpiresAt < new Date()) {
      // Limpiar token expirado
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { emailChangePending: null, emailChangeToken: null, emailChangeExpiresAt: null },
      });
      return redirect("/profile?email_change=expired");
    }

    // Verificar que el nuevo email no esté ya en uso
    const taken = await prisma.user.findUnique({
      where: { email: dbUser.emailChangePending },
      select: { id: true },
    });
    if (taken) {
      // Limpiar la solicitud para que no quede el token huérfano
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { emailChangePending: null, emailChangeToken: null, emailChangeExpiresAt: null },
      });
      return redirect("/profile?email_change=taken");
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        email: dbUser.emailChangePending,
        emailChangePending: null,
        emailChangeToken: null,
        emailChangeExpiresAt: null,
      },
    });

    return redirect("/profile?email_change=success");
  } catch (err) {
    console.error("[api/profile/email-confirm GET]", err);
    return redirect("/profile?email_change=error");
  }
};
