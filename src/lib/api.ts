export const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function isAdmin(locals: App.Locals): boolean {
  return locals.user?.roleId === 2;
}
