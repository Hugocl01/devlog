import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/auth/login", url.origin));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return Response.redirect(new URL("/auth/login?error=invalid-token", url.origin));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return Response.redirect(new URL("/auth/email-verified", url.origin));
  } catch (err) {
    console.error("[api/auth/verify-email]", err);
    return Response.redirect(new URL("/auth/login?error=server-error", url.origin));
  }
};
