import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { createJWT } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";

export const prerender = false;

type GithubUser = {
  id: number;
  name: string | null;
  login: string;
  email: string | null;
  avatar_url: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies.get("github_oauth_state")?.value;

  // Borra la cookie de estado en cualquier caso
  cookies.delete("github_oauth_state", { path: "/" });

  // Validación de estado CSRF
  if (!code || !state || !storedState || state !== storedState) {
    return redirect("/auth/login?error=oauth_state");
  }

  const clientId = import.meta.env.GITHUB_CLIENT_ID as string | undefined;
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET as string | undefined;

  if (!clientId || !clientSecret) {
    return redirect("/auth/login?error=oauth_config");
  }

  try {
    // Intercambiar el código por un access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${import.meta.env.SITE_URL}/api/auth/github/callback`,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      return redirect("/auth/login?error=oauth_token");
    }

    const accessToken = tokenData.access_token;

    // Obtener perfil y emails en paralelo
    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "DevLog",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "DevLog",
        },
      }),
    ]);

    const githubUser = (await userRes.json()) as GithubUser;
    const githubEmails = (await emailsRes.json()) as GithubEmail[];

    // Preferir el email primario verificado
    const primaryEmail = Array.isArray(githubEmails)
      ? (githubEmails.find((e) => e.primary && e.verified)?.email ??
          githubEmails.find((e) => e.verified)?.email)
      : null;

    const email = (primaryEmail ?? githubUser.email)?.toLowerCase();
    if (!email) {
      return redirect("/auth/login?error=oauth_no_email");
    }

    const githubId = String(githubUser.id);
    const name = githubUser.name || githubUser.login;
    const avatar = githubUser.avatar_url ?? null;

    // Buscar usuario existente por githubId o email
    let user = await prisma.user.findFirst({
      where: { OR: [{ githubId }, { email }] },
    });

    if (user) {
      if (user.banned) {
        return redirect("/auth/login?error=banned");
      }
      // Vincular GitHub si aún no está vinculado; actualizar avatar si no tiene
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: user.githubId ?? githubId,
          avatar: user.avatar ?? avatar,
          emailVerified: true,
        },
      });
    } else {
      // Crear cuenta nueva — sin contraseña, email verificado por GitHub
      const role = await prisma.role.findFirst({ where: { name: "USER" } });
      user = await prisma.user.create({
        data: {
          name,
          email,
          githubId,
          avatar,
          emailVerified: true,
          roleId: role?.id ?? 1,
        },
      });
    }

    // Crear sesión de 7 días
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = createJWT(user.id, "7d");

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: getClientIp(request),
      },
    });

    cookies.set("devlog_session", token, {
      httpOnly: true,
      secure: import.meta.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return redirect("/blog");
  } catch (err) {
    console.error("[api/auth/github/callback]", err);
    return redirect("/auth/login?error=oauth_error");
  }
};
