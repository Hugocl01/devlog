import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, Trash2, Search, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface BannedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: number;
  bannedAt: string | null;
  createdAt: string;
  role: { name: string };
  _count: { comments: number };
}

interface Props { users: BannedUser[] }

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function BannedUsersTable({ users: initial }: Props) {
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");
  const [unbanning, setUnbanning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const unban = async (id: string, name: string) => {
    setUnbanning(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success(`${name} puede volver a iniciar sesión`, { duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desbanear");
    } finally {
      setUnbanning(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Usuario eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60">{filtered.length} / {users.length}</span>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border/60 py-16 text-center text-sm text-muted-foreground">
          No hay usuarios baneados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orange-500/20 bg-orange-500/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-500/20 bg-orange-500/10">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Baneado el</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Registro</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-500/10">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-orange-500/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm" className="shrink-0">
                        {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                        <AvatarFallback className="bg-secondary/50 text-muted-foreground text-xs font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className={cn("font-medium truncate max-w-40")}>{u.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                    {formatDate(u.bannedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/users/${u.id}`}
                        title="Ver detalles"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => unban(u.id, u.name)}
                        disabled={unbanning === u.id}
                        title="Desbanear usuario"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                        title="Eliminar permanentemente"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar a "${deleteTarget?.name}"`}
        description="Se eliminarán todos sus datos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar usuario"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
