import { useState, useMemo } from "react";
import {
  ArrowLeft, ExternalLink, Search, X, Reply,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Trash2, ShieldOff, ShieldCheck, Loader2, MessageSquare, Trash,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  banned: boolean;
  deleted: boolean;
  user: { id: string; name: string; avatar: string | null };
  parent: { content: string; deleted: boolean; user: { name: string } } | null;
}

interface PostInfo {
  slug: string;
  title: string;
}

interface Props {
  post: PostInfo;
  initialComments: CommentRow[];
}

type SortKey = "author" | "date";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function SortHeader({ label, col, current, dir, onSort, className }: {
  label: string; col: SortKey; current: SortKey; dir: SortDir;
  onSort: (c: SortKey) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(col)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")}
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

function PaginationBar({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const btn = "flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return (
    <div className="flex items-center justify-end gap-0.5 px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
      <button className={btn} disabled={page === 1} onClick={() => onPage(1)}>«</button>
      <button className={btn} disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      <span className="px-2.5 font-medium text-foreground tabular-nums">{page} / {pageCount}</span>
      <button className={btn} disabled={page === pageCount} onClick={() => onPage(page + 1)}>›</button>
      <button className={btn} disabled={page === pageCount} onClick={() => onPage(pageCount)}>»</button>
    </div>
  );
}

export default function PostCommentsView({ post, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [togglingBan, setTogglingBan] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; author: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkBanning, setBulkBanning] = useState(false);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir(col === "date" ? "desc" : "asc"); }
    setPage(1);
  };
  const handleFilter = (fn: () => void) => { fn(); setPage(1); };

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return comments.filter((c) => {
      const matchSearch = !q || c.user.name.toLowerCase().includes(q) || c.content.toLowerCase().includes(q);
      const matchType =
        typeFilter === "all" ||
        (typeFilter === "reply" ? c.parentId !== null : false) ||
        (typeFilter === "comment" ? c.parentId === null : false) ||
        (typeFilter === "deleted" ? c.deleted : false);
      return matchSearch && matchType;
    });
  }, [comments, search, typeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = sortKey === "author"
        ? a.user.name.localeCompare(b.user.name)
        : a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allPageSelected = paginated.length > 0 && paginated.every((c) => selected.has(c.id));
  const somePageSelected = paginated.some((c) => selected.has(c.id));
  const toggleSelectAll = () => setSelected(allPageSelected ? new Set() : new Set(paginated.map((c) => c.id)));

  const selectedBannedCount = [...selected].filter((id) => comments.find((c) => c.id === id)?.banned).length;
  const selectedActiveCount = selected.size - selectedBannedCount;

  const bannedTotal = comments.filter((c) => c.banned).length;
  const deletedTotal = comments.filter((c) => c.deleted).length;
  const repliesTotal = comments.filter((c) => c.parentId !== null).length;

  const toggleBan = async (id: string, currentBanned: boolean) => {
    setTogglingBan(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !currentBanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, banned: !currentBanned } : c));
      toast.success(currentBanned ? "Comentario restaurado" : "Comentario baneado", { duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setTogglingBan(null);
    }
  };

  const bulkBan = async (banned: boolean) => {
    setBulkBanning(true);
    const ids = [...selected];
    try {
      const res = await fetch("/api/admin/comments/bulk-ban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, banned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setComments((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, banned } : c));
      setSelected(new Set());
      toast.success(
        banned
          ? `${data.count} comentario${data.count !== 1 ? "s" : ""} baneado${data.count !== 1 ? "s" : ""}`
          : `${data.count} comentario${data.count !== 1 ? "s" : ""} restaurado${data.count !== 1 ? "s" : ""}`,
        { duration: 3000 }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al banear");
    } finally {
      setBulkBanning(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.map((c) => c.id === deleteTarget.id ? { ...c, deleted: true, content: "" } : c));
        setSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
        setDeleteTarget(null);
        toast.success("Comentario eliminado", { duration: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("No se pudo eliminar", { description: (data as { error?: string }).error });
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    let ok = 0, fail = 0;
    try {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
        res.ok ? ok++ : fail++;
      }));
      setComments((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, deleted: true, content: "" } : c));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      fail === 0
        ? toast.success(`${ok} comentario${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`, { duration: 3000 })
        : toast.warning(`${ok} eliminado${ok !== 1 ? "s" : ""}, ${fail} fallaron`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBulkDeleting(false);
    }
  };

  const hasFilters = search || typeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => { window.location.href = "/admin/posts"; }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a posts
      </button>

      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Comentarios del post</p>
          <h1 className="text-lg font-bold truncate">{post.title}</h1>
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
          >
            {post.slug}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{comments.length}</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
          {repliesTotal > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm">
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{repliesTotal}</span>
              <span className="text-xs text-muted-foreground">respuesta{repliesTotal !== 1 ? "s" : ""}</span>
            </div>
          )}
          {bannedTotal > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400">
              <ShieldOff className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{bannedTotal}</span>
              <span className="text-xs">baneado{bannedTotal !== 1 ? "s" : ""}</span>
            </div>
          )}
          {deletedTotal > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-600 dark:text-red-400">
              <Trash className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{deletedTotal}</span>
              <span className="text-xs">eliminado{deletedTotal !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por autor o contenido..."
            value={search}
            onChange={(e) => handleFilter(() => setSearch(e.target.value))}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => handleFilter(() => setTypeFilter(e.target.value))}
          className="h-9 rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="all">Todos los tipos</option>
          <option value="comment">Solo comentarios</option>
          <option value="reply">Solo respuestas</option>
          <option value="deleted">Solo eliminados</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => handleFilter(() => { setSearch(""); setTypeFilter("all"); })}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {comments.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-secondary/10 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs font-medium text-foreground">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          {selectedActiveCount > 0 && (
            <button
              onClick={() => bulkBan(true)}
              disabled={bulkBanning}
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
            >
              {bulkBanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
              Banear ({selectedActiveCount})
            </button>
          )}
          {selectedBannedCount > 0 && (
            <button
              onClick={() => bulkBan(false)}
              disabled={bulkBanning}
              className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
            >
              {bulkBanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Restaurar ({selectedBannedCount})
            </button>
          )}
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar ({selected.size})
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <SortHeader label="Autor" col="author" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentario</th>
              <SortHeader label="Fecha" col="date" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {comments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Este post no tiene comentarios.
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Ningún comentario coincide con los filtros.
                </td>
              </tr>
            ) : paginated.map((comment) => (
              <tr
                key={comment.id}
                className={cn(
                  "transition-colors",
                  comment.deleted ? "bg-red-500/5 hover:bg-red-500/8 opacity-70" :
                  comment.banned ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-secondary/10",
                  selected.has(comment.id) && "bg-primary/5"
                )}
              >
                <td className="w-10 px-4 py-3">
                  <Checkbox checked={selected.has(comment.id)} onCheckedChange={() => toggleSelect(comment.id)} />
                </td>

                <td className="px-4 py-3">
                  <a href={`/admin/users/${comment.user.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                    <Avatar className="size-7 shrink-0">
                      {comment.user.avatar && <AvatarImage src={comment.user.avatar} alt={comment.user.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(comment.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-primary hover:underline truncate block max-w-28">
                        {comment.user.name}
                      </span>
                      {comment.deleted && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                          <Trash className="h-2.5 w-2.5" /> eliminado
                        </span>
                      )}
                      {comment.banned && !comment.deleted && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                          <ShieldOff className="h-2.5 w-2.5" /> baneado
                        </span>
                      )}
                    </div>
                  </a>
                </td>

                <td className="px-4 py-3 max-w-sm">
                  {comment.parent && (
                    <div className="mb-1 flex items-start gap-1 rounded-md bg-secondary/30 px-2 py-1">
                      <Reply className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                      <p className="truncate text-xs text-muted-foreground/70">
                        <span className="font-medium">{comment.parent.user.name}:</span>{" "}
                        {comment.parent.deleted
                          ? <span className="italic">[comentario eliminado]</span>
                          : comment.parent.content}
                      </p>
                    </div>
                  )}
                  <p
                    className={cn(
                      "truncate",
                      comment.deleted ? "text-muted-foreground/40 italic" :
                      comment.banned ? "text-muted-foreground/50 line-through" : "text-muted-foreground"
                    )}
                    title={comment.deleted ? undefined : comment.content}
                  >
                    {comment.deleted ? "[comentario eliminado]" : comment.content}
                  </p>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                  <a
                    href={`/blog/${post.slug}#comment-${comment.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver en el blog"
                    className="hover:text-primary transition-colors"
                  >
                    {formatDate(comment.createdAt)}
                  </a>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleBan(comment.id, comment.banned)}
                      disabled={togglingBan === comment.id || comment.deleted}
                      title={comment.deleted ? "Comentario eliminado" : comment.banned ? "Restaurar comentario" : "Banear comentario"}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                        comment.banned
                          ? "text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20"
                          : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                      )}
                    >
                      {togglingBan === comment.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : comment.banned
                          ? <ShieldCheck className="h-3.5 w-3.5" />
                          : <ShieldOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: comment.id, author: comment.user.name })}
                      disabled={comment.deleted}
                      title={comment.deleted ? "Ya eliminado" : "Eliminar comentario"}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar page={safePage} pageCount={pageCount} onPage={setPage} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar comentario"
        description={`¿Seguro que quieres eliminar el comentario de "${deleteTarget?.author}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar comentario"
        onConfirm={confirmDelete}
        loading={deleting}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        title={`Eliminar ${selected.size} comentario${selected.size !== 1 ? "s" : ""}`}
        description={`¿Seguro que quieres eliminar ${selected.size} comentario${selected.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={`Eliminar ${selected.size} comentario${selected.size !== 1 ? "s" : ""}`}
        onConfirm={confirmBulkDelete}
        loading={bulkDeleting}
      />
    </div>
  );
}
