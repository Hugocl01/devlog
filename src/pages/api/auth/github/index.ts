import type { APIRoute } from "astro";
import { getClientIp, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  const clientId = import.meta.env.GITHUB_CLIENT_ID as string | undefined;
  if (!clientId) {
    return new Response("GitHub OAuth no está configurado", { status: 503 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`github-init:${ip}`, 10, 60 * 1000)) {
    return rateLimitedResponse(60);
  }

  const state = crypto.randomUUID();

  cookies.set("github_oauth_state", state, {
    httpOnly: true,
    secure: import.meta.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutos
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${import.meta.env.SITE_URL}/api/auth/github/callback`,
    scope: "user:email",
    state,
  });

  return redirect(`https://github.com/login/oauth/authorize?${params}`);
};
