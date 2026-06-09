import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, MessageSquare,
  Heart, Search, X, FileText, Tag, Eye, EyeOff, Loader2, Pencil, Trash2, BarChart2, Download,
  Globe, Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

export interface AdminPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author?: string | null;
  tags: string[];
  draft: boolean;
  scheduledAt?: string | null;
  comments: number;
  reactions: number;
  views: number;
}

interface Props {
  posts: AdminPost[];
}

type SortKey = "title" | "date" | "comments" | "reactions" | "views";
type SortDir = "asc" | "desc";

function SortHeader({ label, col, current, dir, onSort, className }: {
  label: string; col: SortKey; current: SortKey; dir: SortDir;
  onSort: (c: SortKey) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap",
          active && "text-foreground"
        )}
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
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

const PAGE_SIZE = 20;

export default function PostsTable({ posts }: Props) {
  const [localPosts, setLocalPosts] = useState(posts);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [draftFilter, setDraftFilter] = useState("all");

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkToggling, setBulkToggling] = useState(false);

  const toggleDraft = async (slug: string, currentDraft: boolean) => {
    setTogglingSlug(slug);
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: !currentDraft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error desconocido");
      }
      setLocalPosts((prev) =>
        prev.map((p) => p.slug === slug ? { ...p, draft: !currentDraft } : p)
      );
      toast.success(currentDraft ? "Post publicado" : "Post archivado como borrador", {
        description: currentDraft ? "Ya es visible en el blog." : "Ya no aparece públicamente.",
        duration: 3000,
      });
    } catch (err) {
      toast.error("No se pudo cambiar el estado", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setTogglingSlug(null);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    localPosts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [localPosts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return localPosts.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchTag = tagFilter === "all" || p.tags.includes(tagFilter);
      const matchDraft =
        draftFilter === "all" ||
        (draftFilter === "draft" ? p.draft : !p.draft);
      return matchSearch && matchTag && matchDraft;
    });
  }, [localPosts, search, tagFilter, draftFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":     cmp = a.title.localeCompare(b.title); break;
        case "date":      cmp = a.date.localeCompare(b.date); break;
        case "comments":  cmp = a.comments - b.comments; break;
        case "reactions": cmp = a.reactions - b.reactions; break;
        case "views":     cmp = a.views - b.views; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const from      = Math.min((safePage - 1) * PAGE_SIZE + 1, sorted.length || 1);
  const to        = Math.min(safePage * PAGE_SIZE, sorted.length);
  const paginated = sorted.slice(from - 1, to);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir(col === "date" ? "desc" : "asc"); }
    setPage(1);
  };

  const handleFilter = (fn: () => void) => { fn(); setPage(1); };

  const hasFilters = search || tagFilter !== "all" || draftFilter !== "all";

  const toggleSelect    = (slug: string) => setSelected((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const allPageSelected  = paginated.length > 0 && paginated.every((p) => selected.has(p.slug));
  const somePageSelected = paginated.some((p) => selected.has(p.slug));
  const toggleSelectAll  = () => setSelected(allPageSelected ? new Set() : new Set(paginated.map((p) => p.slug)));

  const bulkSetDraft = async (draft: boolean) => {
    setBulkToggling(true);
    const slugs = [...selected];
    let ok = 0, fail = 0;
    try {
      await Promise.all(
        slugs.map(async (slug) => {
          const res = await fetch(`/api/admin/posts/${slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft }),
          });
          if (res.ok) {
            ok++;
          } else {
            fail++;
          }
        })
      );
      setLocalPosts((prev) =>
        prev.map((p) => slugs.includes(p.slug) ? { ...p, draft } : p)
      );
      setSelected(new Set());
      const label = draft ? "archivado" : "publicado";
      fail === 0
        ? toast.success(`${ok} post${ok !== 1 ? "s" : ""} ${label}${ok !== 1 ? "s" : ""}`, { duration: 3000 })
        : toast.warning(`${ok} ${label}${ok !== 1 ? "s" : ""}, ${fail} fallaron`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBulkToggling(false);
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    const slugs = [...selected];
    let ok = 0, fail = 0;
    try {
      await Promise.all(
        slugs.map(async (slug) => {
          const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
          res.ok ? ok++ : fail++;
        })
      );
      setLocalPosts((prev) => prev.filter((p) => !slugs.includes(p.slug)));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      fail === 0
        ? toast.success(`${ok} post${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`, { duration: 3000 })
        : toast.warning(`${ok} eliminado${ok !== 1 ? "s" : ""}, ${fail} fallaron`, {
            description: "Algunos posts no pudieron eliminarse.",
          });
    } catch {
      toast.error("Error de conexión", { description: "No se pudo contactar con el servidor." });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por título, descripción o etiqueta..."
            value={search}
            onChange={(e) => handleFilter(() => setSearch(e.target.value))}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select value={tagFilter} onValueChange={(v) => handleFilter(() => setTagFilter(v))}>
          <SelectTrigger className="h-9 max-w-52 border-border/60 bg-secondary/30 text-sm">
            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <SelectValue placeholder="Todas las etiquetas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etiquetas</SelectItem>
            {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={draftFilter} onValueChange={(v) => handleFilter(() => setDraftFilter(v))}>
          <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Publicados y borradores</SelectItem>
            <SelectItem value="published">Solo publicados</SelectItem>
            <SelectItem value="draft">Solo borradores</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => handleFilter(() => { setSearch(""); setTagFilter("all"); setDraftFilter("all"); })}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {localPosts.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-secondary/10 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs font-medium text-foreground">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => bulkSetDraft(false)}
            disabled={bulkToggling}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Publicar
          </button>
          <button
            onClick={() => bulkSetDraft(true)}
            disabled={bulkToggling}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
            Archivar
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
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
              <SortHeader label="Título" col="title" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Fecha" col="date" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Etiquetas</th>
              <SortHeader label="Visitas" col="views" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortHeader label="Coment." col="comments" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortHeader label="Reacc." col="reactions" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ningún post coincide con los filtros." : "No hay posts."}
                </td>
              </tr>
            ) : (
              paginated.map((post) => (
                <tr key={post.slug} className={cn("hover:bg-secondary/10 transition-colors", selected.has(post.slug) && "bg-secondary/20")}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(post.slug)}
                      onCheckedChange={() => toggleSelect(post.slug)}
                    />
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 rounded-md bg-secondary/40 p-1.5 shrink-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-xs" title={post.title}>
                          {post.title}
                          {post.draft && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              borrador
                            </span>
                          )}
                          {!post.draft && post.scheduledAt && new Date(post.scheduledAt) > new Date() && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              programado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs hidden sm:block" title={post.description}>
                          {post.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(post.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground border border-border/40"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-[11px] text-muted-foreground/60">+{post.tags.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* View count */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      post.views > 0
                        ? "bg-secondary/50 text-muted-foreground"
                        : "text-muted-foreground/40"
                    )}>
                      <BarChart2 className="h-3 w-3" />
                      {post.views.toLocaleString("es-ES")}
                    </span>
                  </td>

                  {/* Comment count */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a
                      href={`/admin/posts/${post.slug}/comments`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        post.comments > 0
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "text-muted-foreground/50 cursor-default pointer-events-none"
                      )}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {post.comments}
                    </a>
                  </td>

                  {/* Reaction count */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {post.reactions > 0 ? (
                      <a
                        href={`/admin/posts/${post.slug}/reactions`}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <Heart className="h-3 w-3" />
                        {post.reactions}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground/50">
                        <Heart className="h-3 w-3" />
                        {post.reactions}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleDraft(post.slug, post.draft)}
                        disabled={togglingSlug === post.slug}
                        title={post.draft ? "Publicar post" : "Mover a borrador"}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                          post.draft
                            ? "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            : "text-primary hover:text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        {togglingSlug === post.slug
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : post.draft
                            ? <EyeOff className="h-3.5 w-3.5" />
                            : <Eye className="h-3.5 w-3.5" />
                        }
                      </button>
                      <a
                        href={`/admin/posts/${post.slug}/analytics`}
                        title="Ver analíticas"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/api/admin/posts/${post.slug}/export`}
                        download={`${post.slug}.md`}
                        title="Exportar como Markdown"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/admin/posts/${post.slug}/edit`}
                        title="Editar post"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver post"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {sorted.length > 0 && (
          <PaginationBar
            page={safePage}
            pageCount={pageCount}
            from={from}
            to={to}
            total={sorted.length}
            onPage={setPage}
          />
        )}
      </div>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        title={`Eliminar ${selected.size} post${selected.size !== 1 ? "s" : ""}`}
        description={`¿Seguro que quieres eliminar ${selected.size} post${selected.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={`Eliminar ${selected.size} post${selected.size !== 1 ? "s" : ""}`}
        onConfirm={confirmBulkDelete}
        loading={bulkDeleting}
      />
    </>
  );
}
