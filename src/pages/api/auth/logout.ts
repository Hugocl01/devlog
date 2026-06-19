import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get("devlog_session")?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }

  cookies.delete("devlog_session", {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
