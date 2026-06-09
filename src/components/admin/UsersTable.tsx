import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Trash2, ChevronDown, Search, X, CheckCircle2,
  XCircle, ChevronsUpDown, ChevronUp, LogOut, Eye, ShieldOff, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface Role { id: number; name: string }

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: number;
  emailVerified: boolean;
  banned: boolean;
  bannedAt: string | null;
  createdAt: string;
  role: { name: string };
  _count: { comments: number; reactions: number; sessions: number };
}

interface Props {
  users: AdminUser[];
  roles: Role[];
  currentUserId: string;
}

type SortKey = "name" | "email" | "role" | "verified" | "comments" | "reactions" | "sessions" | "createdAt";

const PAGE_SIZE = 20;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function SortHeader({ label, col, current, dir, onSort }: {
  label: string; col: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = current === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      {active
        ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

function PaginationBar({ page, pageCount, from, to, total, onPage }: {
  page: number; pageCount: number; from: number; to: number; total: number;
  onPage: (p: number) => void;
}) {
  const btn = "flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
      <span>{from}–{to} de {total}</span>
      <div className="flex items-center gap-0.5">
        <button className={btn} disabled={page === 1} onClick={() => onPage(1)}>«</button>
        <button className={btn} disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        <span className="px-2.5 font-medium text-foreground tabular-nums">{page} / {pageCount}</span>
        <button className={btn} disabled={page === pageCount} onClick={() => onPage(page + 1)}>›</button>
        <button className={btn} disabled={page === pageCount} onClick={() => onPage(pageCount)}>»</button>
      </div>
    </div>
  );
}

export default function UsersTable({ users: initial, roles, currentUserId }: Props) {
  const [users, setUsers] = useState(initial);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [roleChangePending, setRoleChangePending] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || String(u.roleId) === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":      cmp = a.name.localeCompare(b.name); break;
        case "email":     cmp = a.email.localeCompare(b.email); break;
        case "role":      cmp = a.roleId - b.roleId; break;
        case "verified":  cmp = (a.emailVerified ? 1 : 0) - (b.emailVerified ? 1 : 0); break;
        case "comments":  cmp = a._count.comments - b._count.comments; break;
        case "reactions": cmp = a._count.reactions - b._count.reactions; break;
        case "sessions":  cmp = a._count.sessions - b._count.sessions; break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const from      = Math.min((safePage - 1) * PAGE_SIZE + 1, sorted.length);
  const to        = Math.min(safePage * PAGE_SIZE, sorted.length);
  const paginated = sorted.slice(from - 1, to);

  useEffect(() => setPage(1), [search, roleFilter, sortKey, sortDir]);
  useEffect(() => setSelected(new Set()), [page]);

  const allPageSelected  = paginated.length > 0 && paginated.every((u) => selected.has(u.id));
  const somePageSelected = paginated.some((u) => selected.has(u.id));
  const someSelected     = selected.size > 0;

  const toggleSelect    = (id: string) => setSelected((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = () => setSelected(allPageSelected ? new Set() : new Set(paginated.map((u) => u.id)));

  const changeRole = async (userId: string, roleId: number) => {
    setRoleChangePending(userId);
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((p) => p.map((u) => u.id === userId ? { ...u, roleId: data.user.roleId, role: data.user.role } : u));
        toast.success("Rol actualizado", {
          description: "Los cambios son efectivos de inmediato.",
          duration: 3000,
        });
      } else {
        toast.error("No se pudo actualizar el rol", {
          description: data.error,
        });
      }
    } finally {
      setRoleChangePending(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setUsers((p) => p.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success("Usuario eliminado", {
          description: deleteTarget.name,
          duration: 3000,
        });
      } else {
        toast.error("No se pudo eliminar el usuario", {
          description: data.error,
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    const ids  = [...selected].filter((id) => id !== currentUserId);
    let   fail = 0;
    await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) setUsers((p) => p.filter((u) => u.id !== id));
        else fail++;
      })
    );
    setSelected(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
    fail > 0
      ? toast.warning(`${fail} usuario${fail !== 1 ? "s" : ""} no pudo${fail !== 1 ? "ron" : ""} eliminarse`, {
          description: `${ids.length - fail} eliminado${ids.length - fail !== 1 ? "s" : ""} correctamente.`,
        })
      : toast.success(`${ids.length} usuario${ids.length !== 1 ? "s" : ""} eliminado${ids.length !== 1 ? "s" : ""}`, {
          duration: 3000,
        });
  };

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    setBanningId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !currentBanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setUsers((p) => p.map((u) => u.id === userId
        ? { ...u, banned: !currentBanned, bannedAt: !currentBanned ? new Date().toISOString() : null, _count: { ...u._count, sessions: !currentBanned ? 0 : u._count.sessions } }
        : u
      ));
      toast.success(currentBanned ? "Usuario desbanado" : "Usuario baneado", {
        description: currentBanned ? "Puede volver a iniciar sesión." : "Sus sesiones han sido cerradas.",
        duration: 3000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setBanningId(null);
    }
  };

  const revokeSessions = async (userId: string, name: string) => {
    const res  = await fetch(`/api/admin/users/${userId}/sessions`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setUsers((p) => p.map((u) => u.id === userId ? { ...u, _count: { ...u._count, sessions: 0 } } : u));
      toast.success("Sesiones revocadas", {
        description: `${name} deberá iniciar sesión de nuevo.`,
        duration: 4000,
      });
    } else {
      toast.error("No se pudieron revocar las sesiones", {
        description: data.error,
      });
    }
  };

  const hasFilters = search || roleFilter !== "all";

  return (
    <>
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setRoleFilter("all"); }}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">{filtered.length} / {users.length}</span>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 animate-in slide-in-from-top-1 duration-150">
          <span className="text-sm font-medium text-primary">{selected.size} seleccionado{selected.size !== 1 && "s"}</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
            >
              Eliminar seleccionados
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <th className="px-3 py-3 w-8">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader label="Usuario" col="name" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">
                <SortHeader label="Rol" col="role" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center hidden md:table-cell">
                <SortHeader label="Email ✓" col="verified" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">
                <SortHeader label="Coment." col="comments" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">
                <SortHeader label="Reacc." col="reactions" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center hidden xl:table-cell">
                <SortHeader label="Sesiones" col="sessions" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">
                <SortHeader label="Registro" col="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.map((user) => {
              const isSelf      = user.id === currentUserId;
              const isRoleLoad  = roleChangePending === user.id;
              const isSelected  = selected.has(user.id);
              const isBanning   = banningId === user.id;

              return (
                <tr
                  key={user.id}
                  className={cn(
                    "transition-colors",
                    user.banned ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-secondary/10",
                    isSelected && "bg-primary/5",
                    isRoleLoad && "opacity-60"
                  )}
                >
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(user.id)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar size="sm" className="shrink-0">
                        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {user.name} {isSelf && <span className="text-xs text-muted-foreground">(tú)</span>}
                          {user.banned && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                              <ShieldOff className="h-2.5 w-2.5" /> baneado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 hidden sm:table-cell">
                    {isSelf ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        user.roleId === 2
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-secondary/50 text-muted-foreground border border-border/60"
                      )}>
                        {user.roleId === 2 && <Shield className="h-3 w-3" />}
                        {user.role.name}
                      </span>
                    ) : (
                      <Select
                        value={String(user.roleId)}
                        onValueChange={(v) => changeRole(user.id, Number(v))}
                        disabled={isRoleLoad}
                      >
                        <SelectTrigger size="sm" className="h-7 rounded-full border-border/60 bg-secondary/20 px-2.5 text-xs font-medium gap-1 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {user.emailVerified
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </td>

                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground hidden lg:table-cell">
                    {user._count.comments}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground hidden lg:table-cell">
                    {user._count.reactions}
                  </td>

                  <td className="px-4 py-3 text-center hidden xl:table-cell">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={cn("tabular-nums text-xs", user._count.sessions > 0 ? "text-amber-500 font-medium" : "text-muted-foreground/50")}>
                        {user._count.sessions}
                      </span>
                      {user._count.sessions > 0 && (
                        <button
                          onClick={() => revokeSessions(user.id, user.name)}
                          title="Revocar sesiones"
                          className="text-muted-foreground/50 hover:text-red-500 transition-colors"
                        >
                          <LogOut className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden xl:table-cell">
                    {formatDate(user.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/users/${user.id}`}
                        title="Ver detalles"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      {!isSelf && user.roleId !== 2 && (
                        <button
                          onClick={() => toggleBan(user.id, user.banned)}
                          disabled={isBanning}
                          title={user.banned ? "Desbanear usuario" : "Banear usuario"}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                            user.banned
                              ? "text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20"
                              : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                          )}
                        >
                          {user.banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                          title="Eliminar usuario"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {hasFilters ? "Ningún usuario coincide con los filtros." : "No hay usuarios."}
          </p>
        ) : (
          <PaginationBar page={safePage} pageCount={pageCount} from={from} to={to} total={sorted.length} onPage={setPage} />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar usuario"
        description={`¿Seguro que quieres eliminar a "${deleteTarget?.name}"? Se borrarán sus comentarios y sesiones activas.`}
        confirmLabel="Eliminar usuario"
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && setBulkDeleteOpen(false)}
        title="Eliminar usuarios"
        description={`¿Eliminar ${selected.size} usuario${selected.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={`Eliminar ${selected.size}`}
        onConfirm={confirmBulkDelete}
        loading={bulkDeleting}
      />
    </>
  );
}
