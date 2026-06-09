import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search, X, ExternalLink, Reply, ShieldCheck, Trash2,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

interface CommentRow {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  post: { slug: string; title: string };
  user: { id: string; name: string; avatar: string | null };
  parent: { content: string; user: { name: string } } | null;
}

interface Props { comments: CommentRow[] }

type SortKey = "author" | "createdAt" | "post";
type SortDir  = "asc" | "desc";
const PAGE_SIZE = 20;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function SortHeader({ label, sortKey, current, dir, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        {active ? dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </th>
  );
}

export default function BannedCommentsTable({ comments: initial }: Props) {
  const [comments, setComments] = useState(initial);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; author: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return comments.filter((c) =>
      !q || c.user.name.toLowerCase().includes(q) || c.content.toLowerCase().includes(q) || c.post.title.toLowerCase().includes(q)
    );
  }, [comments, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "author")    cmp = a.user.name.localeCompare(b.user.name);
      if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
      if (sortKey === "post")      cmp = a.post.title.localeCompare(b.post.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
    setPage(1);
  };

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comentario restaurado", { description: "Ya es visible en el blog.", duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al restaurar");
    } finally {
      setRestoringId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success("Comentario eliminado permanentemente");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Error al eliminar", { description: (data as { error?: string }).error });
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  const btnPage = "rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60">{filtered.length} / {comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-border/60 py-16 text-center text-sm text-muted-foreground">
          No hay comentarios baneados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orange-500/20 bg-orange-500/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-500/20 bg-orange-500/10">
                <SortHeader label="Autor" sortKey="author" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentario (oculto)</th>
                <SortHeader label="Post" sortKey="post" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                <SortHeader label="Fecha" sortKey="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-500/10">
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="hover:bg-orange-500/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" className="shrink-0">
                        {c.user.avatar && <AvatarImage src={c.user.avatar} alt={c.user.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(c.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-28">{c.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {c.parent && (
                      <div className="mb-1 flex items-start gap-1 rounded bg-secondary/30 px-2 py-1">
                        <Reply className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/40" />
                        <p className="truncate text-xs text-muted-foreground/60">
                          <span className="font-medium">{c.parent.user.name}:</span> {c.parent.content}
                        </p>
                      </div>
                    )}
                    <p className="truncate text-muted-foreground/60 line-through text-xs" title={c.content}>
                      {c.content}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a
                      href={`/blog/${c.post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-35"
                    >
                      {c.post.title} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => restore(c.id)}
                        disabled={restoringId === c.id}
                        title="Restaurar comentario"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: c.id, author: c.user.name })}
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

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button className={btnPage} disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
          <button className={btnPage} disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
          <span className="tabular-nums text-xs text-muted-foreground">{safePage} / {pageCount}</span>
          <button className={btnPage} disabled={safePage === pageCount} onClick={() => setPage((p) => p + 1)}>›</button>
          <button className={btnPage} disabled={safePage === pageCount} onClick={() => setPage(pageCount)}>»</button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar comentario permanentemente"
        description={`¿Seguro? El comentario de "${deleteTarget?.author}" se eliminará definitivamente.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
