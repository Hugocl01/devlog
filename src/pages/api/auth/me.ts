import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
  const user = locals.user ?? null;
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
