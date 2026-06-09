import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Trash2, ExternalLink, Search, X, ChevronDown, ChevronUp,
  ChevronsUpDown, Reply, ShieldOff, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  banned: boolean;
  post: { slug: string; title: string };
  user: { id: string; name: string; avatar: string | null };
  parent: { content: string; user: { name: string } } | null;
}

interface Props {
  comments: CommentRow[];
  initialPostFilter?: string;
}

type SortKey = "author" | "createdAt" | "post";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function SortHeader({ label, sortKey, current, dir, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (key: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </th>
  );
}

function PaginationBar({ page, pageCount, onPage }: {
  page: number; pageCount: number; onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const btn = "rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      <button className={btn} disabled={page === 1} onClick={() => onPage(1)}>«</button>
      <button className={btn} disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
      <span className="tabular-nums text-xs text-muted-foreground">{page} / {pageCount}</span>
      <button className={btn} disabled={page === pageCount} onClick={() => onPage(page + 1)}>›</button>
      <button className={btn} disabled={page === pageCount} onClick={() => onPage(pageCount)}>»</button>
    </div>
  );
}

export default function CommentsTable({ comments: initial, initialPostFilter }: Props) {
  const [comments, setComments] = useState(initial);
  const [togglingBan, setTogglingBan] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [postFilter, setPostFilter] = useState(initialPostFilter ?? "all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; author: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkBanning, setBulkBanning] = useState(false);

  const uniquePosts = useMemo(() => {
    const seen = new Map<string, string>();
    comments.forEach((c) => seen.set(c.post.slug, c.post.title));
    return [...seen.entries()].map(([slug, title]) => ({ slug, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [comments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return comments.filter((c) => {
      const matchesSearch =
        !q ||
        c.user.name.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.post.title.toLowerCase().includes(q);
      const matchesPost   = postFilter === "all" || c.post.slug === postFilter;
      const matchesType   = typeFilter === "all"
        || (typeFilter === "reply"   ? c.parentId !== null  : c.parentId === null);
      return matchesSearch && matchesPost && matchesType;
    });
  }, [comments, search, postFilter, typeFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "author")    cmp = a.user.name.localeCompare(b.user.name);
      else if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortKey === "post") cmp = a.post.title.localeCompare(b.post.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };
  const handleFilter = (fn: () => void) => { fn(); setPage(1); };

  const toggleSelect   = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPageSelected  = paginated.length > 0 && paginated.every((c) => selected.has(c.id));
  const somePageSelected = paginated.some((c) => selected.has(c.id));
  const toggleSelectAll  = () => setSelected(allPageSelected ? new Set() : new Set(paginated.map((c) => c.id)));

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
      toast.success(currentBanned ? "Comentario restaurado" : "Comentario baneado", {
        description: currentBanned ? "Ya es visible públicamente." : "Ocultado del blog.",
        duration: 3000,
      });
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
        setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id));
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
      setComments((prev) => prev.filter((c) => !ids.includes(c.id)));
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

  const hasFilters = search || postFilter !== "all" || typeFilter !== "all";
  const selectedBannedCount   = [...selected].filter((id) => comments.find((c) => c.id === id)?.banned).length;
  const selectedActivesCount  = selected.size - selectedBannedCount;

  return (
    <>
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por autor, contenido o post..."
            value={search}
            onChange={(e) => handleFilter(() => setSearch(e.target.value))}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select value={postFilter} onValueChange={(v) => handleFilter(() => setPostFilter(v))}>
          <SelectTrigger className="h-9 max-w-52 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todos los posts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los posts</SelectItem>
            {uniquePosts.map(({ slug, title }) => <SelectItem key={slug} value={slug}>{title}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => handleFilter(() => setTypeFilter(v))}>
          <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="comment">Solo comentarios</SelectItem>
            <SelectItem value="reply">Solo respuestas</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => handleFilter(() => { setSearch(""); setPostFilter("all"); setTypeFilter("all"); })}
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
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-secondary/10 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs font-medium text-foreground">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>

          {selectedActivesCount > 0 && (
            <button
              onClick={() => bulkBan(true)}
              disabled={bulkBanning}
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Banear ({selectedActivesCount})
            </button>
          )}
          {selectedBannedCount > 0 && (
            <button
              onClick={() => bulkBan(false)}
              disabled={bulkBanning}
              className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
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
      {comments.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-border/60">
          No hay comentarios.
        </p>
      ) : (
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
                <SortHeader label="Autor" sortKey="author" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentario</th>
                <SortHeader label="Post" sortKey="post" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                <SortHeader label="Fecha" sortKey="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Ningún comentario coincide con los filtros.
                  </td>
                </tr>
              ) : paginated.map((comment) => (
                <tr
                  key={comment.id}
                  className={cn(
                    "transition-colors",
                    comment.banned ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-secondary/10",
                    selected.has(comment.id) && "bg-primary/5"
                  )}
                >
                  <td className="w-10 px-4 py-3">
                    <Checkbox checked={selected.has(comment.id)} onCheckedChange={() => toggleSelect(comment.id)} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar size="sm" className="shrink-0">
                        {comment.user.avatar && <AvatarImage src={comment.user.avatar} alt={comment.user.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-medium truncate block max-w-28">{comment.user.name}</span>
                        {comment.banned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                            <ShieldOff className="h-2.5 w-2.5" /> baneado
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 max-w-xs">
                    {comment.parent && (
                      <div className="mb-1 flex items-start gap-1 rounded-md bg-secondary/30 px-2 py-1">
                        <Reply className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                        <p className="truncate text-xs text-muted-foreground/70">
                          <span className="font-medium">{comment.parent.user.name}:</span>{" "}
                          {comment.parent.content}
                        </p>
                      </div>
                    )}
                    <p className={cn("truncate", comment.banned ? "text-muted-foreground/50 line-through" : "text-muted-foreground")} title={comment.content}>
                      {comment.content}
                    </p>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <a
                      href={`/blog/${comment.post.slug}#comment-${comment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-35"
                      title={comment.post.title}
                    >
                      {comment.post.title}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                    {formatDate(comment.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleBan(comment.id, comment.banned)}
                        disabled={togglingBan === comment.id}
                        title={comment.banned ? "Restaurar comentario" : "Banear comentario"}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                          comment.banned
                            ? "text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20"
                            : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                        )}
                      >
                        {comment.banned
                          ? <ShieldCheck className="h-3.5 w-3.5" />
                          : <ShieldOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: comment.id, author: comment.user.name })}
                        title="Eliminar comentario"
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

      <PaginationBar page={safePage} pageCount={pageCount} onPage={setPage} />

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
    </>
  );
}
