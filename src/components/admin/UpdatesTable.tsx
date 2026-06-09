import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, Search,
  X, Zap, Eye, EyeOff, Loader2, Pencil, Trash2, BarChart2,
} from "lucide-react";
// BarChart2 también se usa para el botón de analytics
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

export interface AdminUpdate {
  slug: string;
  title: string;
  description: string;
  date: string;
  author?: string | null;
  type: "feature" | "bugfix" | "improvement" | "general";
  draft: boolean;
  views: number;
  scheduledAt?: string | null;
}

interface Props {
  updates: AdminUpdate[];
}

type SortKey = "title" | "date" | "type" | "views";
type SortDir = "asc" | "desc";

const TYPE_META: Record<string, { label: string; className: string }> = {
  feature:     { label: "Nueva función",      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  bugfix:      { label: "Corrección de error", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  improvement: { label: "Mejora",              className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  general:     { label: "General",             className: "bg-secondary/50 text-muted-foreground border-border/40" },
};

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

export default function UpdatesTable({ updates }: Props) {
  const [localUpdates, setLocalUpdates] = useState(updates);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [draftFilter, setDraftFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return localUpdates.filter((u) => {
      const matchSearch =
        !q ||
        u.title.toLowerCase().includes(q) ||
        u.description.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || u.type === typeFilter;
      const matchDraft =
        draftFilter === "all" ||
        (draftFilter === "draft" ? u.draft : !u.draft);
      return matchSearch && matchType && matchDraft;
    });
  }, [localUpdates, search, typeFilter, draftFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "date":  cmp = a.date.localeCompare(b.date);   break;
        case "type":  cmp = a.type.localeCompare(b.type);   break;
        case "views": cmp = a.views - b.views;               break;
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

  const hasFilters = search || typeFilter !== "all" || draftFilter !== "all";

  const toggleSelect    = (slug: string) => setSelected((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const allPageSelected  = paginated.length > 0 && paginated.every((u) => selected.has(u.slug));
  const somePageSelected = paginated.some((u) => selected.has(u.slug));
  const toggleSelectAll  = () => setSelected(allPageSelected ? new Set() : new Set(paginated.map((u) => u.slug)));

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    const slugs = [...selected];
    let ok = 0, fail = 0;
    try {
      await Promise.all(
        slugs.map(async (slug) => {
          const res = await fetch(`/api/admin/updates/${slug}`, { method: "DELETE" });
          res.ok ? ok++ : fail++;
        })
      );
      setLocalUpdates((prev) => prev.filter((u) => !slugs.includes(u.slug)));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      fail === 0
        ? toast.success(`${ok} update${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`, { duration: 3000 })
        : toast.warning(`${ok} eliminado${ok !== 1 ? "s" : ""}, ${fail} fallaron`, {
            description: "Algunos updates no pudieron eliminarse.",
          });
    } catch {
      toast.error("Error de conexión", { description: "No se pudo contactar con el servidor." });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleDraft = async (slug: string, currentDraft: boolean) => {
    setTogglingSlug(slug);
    try {
      const res = await fetch(`/api/admin/updates/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: !currentDraft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error desconocido");
      }
      setLocalUpdates((prev) =>
        prev.map((u) => u.slug === slug ? { ...u, draft: !currentDraft } : u)
      );
      toast.success(currentDraft ? "Update publicado" : "Update archivado como borrador", {
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

  return (
    <>
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por título o descripción..."
            value={search}
            onChange={(e) => handleFilter(() => setSearch(e.target.value))}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => handleFilter(() => setTypeFilter(v))}>
          <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
            <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TYPE_META).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
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
            onClick={() => handleFilter(() => { setSearch(""); setTypeFilter("all"); setDraftFilter("all"); })}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {localUpdates.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-xs font-medium text-foreground">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar seleccionados
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
              <SortHeader label="Tipo" col="type" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortHeader label="Visitas" col="views" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ningún update coincide con los filtros." : "No hay updates."}
                </td>
              </tr>
            ) : (
              paginated.map((update) => {
                const typeMeta = TYPE_META[update.type] ?? TYPE_META.general;
                return (
                  <tr key={update.slug} className={cn("hover:bg-secondary/10 transition-colors", selected.has(update.slug) && "bg-secondary/20")}>
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(update.slug)}
                        onCheckedChange={() => toggleSelect(update.slug)}
                      />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 rounded-md bg-secondary/40 p-1.5 shrink-0">
                          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-xs" title={update.title}>
                            {update.title}
                            {update.draft && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                borrador
                              </span>
                            )}
                            {!update.draft && update.scheduledAt && new Date(update.scheduledAt) > new Date() && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                programado
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs hidden sm:block" title={update.description}>
                            {update.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                      {new Date(update.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border",
                        typeMeta.className
                      )}>
                        {typeMeta.label}
                      </span>
                    </td>

                    {/* Views */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        update.views > 0 ? "bg-secondary/50 text-muted-foreground" : "text-muted-foreground/40"
                      )}>
                        <BarChart2 className="h-3 w-3" />
                        {update.views.toLocaleString("es-ES")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleDraft(update.slug, update.draft)}
                          disabled={togglingSlug === update.slug}
                          title={update.draft ? "Publicar update" : "Mover a borrador"}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                            update.draft
                              ? "text-muted-foreground hover:text-primary hover:bg-primary/10"
                              : "text-primary hover:text-muted-foreground hover:bg-secondary/50"
                          )}
                        >
                          {togglingSlug === update.slug
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : update.draft
                              ? <EyeOff className="h-3.5 w-3.5" />
                              : <Eye className="h-3.5 w-3.5" />
                          }
                        </button>
                        <a
                          href={`/admin/updates/${update.slug}/analytics`}
                          title="Ver analíticas"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/admin/updates/${update.slug}/edit`}
                          title="Editar update"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/updates/${update.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver update"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
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
        title={`Eliminar ${selected.size} update${selected.size !== 1 ? "s" : ""}`}
        description={`¿Seguro que quieres eliminar ${selected.size} update${selected.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`}
        confirmLabel={`Eliminar ${selected.size} update${selected.size !== 1 ? "s" : ""}`}
        onConfirm={confirmBulkDelete}
        loading={bulkDeleting}
      />
    </>
  );
}
