import { useState } from "react";
import { Search, X, Pencil, Trash2, Plus, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "sonner";

interface TagRow {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  _count: { posts: number };
}

interface Props {
  initialTags: TagRow[];
}

const DEFAULT_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4",
];

function toSlug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ColorSwatch({ color }: { color?: string | null }) {
  if (!color) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground/50">
        <span className="inline-block h-5 w-5 rounded-md border border-dashed border-border/60 bg-secondary/30 shrink-0" />
        <span className="hidden sm:inline">Sin color</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-5 w-5 rounded-md border border-border/40 shadow-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="hidden sm:inline font-mono text-xs text-muted-foreground">{color}</span>
    </span>
  );
}

const inputCls = "h-8 w-full rounded-md border border-border/60 bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

export default function TagsTable({ initialTags }: Props) {
  const [tags, setTags] = useState<TagRow[]>(initialTags);
  const [search, setSearch] = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugCustomized, setCreateSlugCustomized] = useState(false);
  const [createColor, setCreateColor] = useState(DEFAULT_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentCreateSlug = createSlugCustomized ? createSlug : toSlug(createName);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tags/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Etiqueta eliminada", { duration: 2500 });
    } catch (err) {
      toast.error("No se pudo eliminar", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    const slug = currentCreateSlug;
    if (!name) { toast.warning("El nombre es obligatorio"); return; }
    if (!slug) { toast.warning("El slug es obligatorio"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, color: createColor || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTags((prev) => [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateName("");
      setCreateSlug("");
      setCreateSlugCustomized(false);
      setCreateColor(DEFAULT_COLORS[0]);
      setShowCreate(false);
      toast.success("Etiqueta creada", {
        description: `"${name}" ya está disponible para los posts.`,
        duration: 3000,
      });
    } catch (err) {
      toast.error("No se pudo crear", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar etiquetas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {search && (
          <button type="button" onClick={() => setSearch("")}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="text-xs text-muted-foreground/60 tabular-nums">{filtered.length} / {tags.length}</span>
        <button type="button" onClick={() => setShowCreate(true)}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Nueva etiqueta
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
          <h3 className="text-sm font-semibold">Nueva etiqueta</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre *</label>
              <input autoFocus type="text" value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="ej: JavaScript" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Slug
                {createSlugCustomized && (
                  <button type="button" onClick={() => { setCreateSlugCustomized(false); setCreateSlug(""); }}
                    className="ml-2 text-primary hover:underline text-[10px] normal-case">
                    ↺ auto
                  </button>
                )}
              </label>
              <input type="text" value={currentCreateSlug}
                onChange={(e) => { setCreateSlug(e.target.value); setCreateSlugCustomized(true); }}
                placeholder="ej: javascript" className={cn(inputCls, "font-mono")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={createColor || "#3b82f6"}
                onChange={(e) => setCreateColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded-lg border border-border/60 bg-background p-0.5" />
              <div className="flex flex-wrap gap-1">
                {DEFAULT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setCreateColor(c)} title={c}
                    className={cn("h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                      createColor === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              {createColor && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
                  style={{ backgroundColor: `${createColor}20`, borderColor: `${createColor}50`, color: createColor }}>
                  <Tag className="h-3 w-3 mr-1" />
                  {createName || "Etiqueta"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowCreate(false); setCreateName(""); setCreateSlug(""); setCreateSlugCustomized(false); }}
              className="h-9 px-3 rounded-full border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={creating}
              className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Crear etiqueta
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Color</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Posts</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {search ? "Ninguna etiqueta coincide." : "No hay etiquetas."}
                </td>
              </tr>
            ) : filtered.map((tag) => (
              <tr
                key={tag.id}
                className="hover:bg-secondary/5 transition-colors cursor-pointer"
                onClick={() => { window.location.href = `/admin/tags/${tag.id}`; }}
              >
                <td className="px-4 py-3"><ColorSwatch color={tag.color} /></td>
                <td className="px-4 py-3">
                  {tag.color ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                      style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}50`, color: tag.color }}>
                      {tag.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary/70">
                      {tag.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <code className="text-xs text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded">{tag.slug}</code>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={cn("text-xs tabular-nums",
                    tag._count.posts > 0 ? "text-foreground font-medium" : "text-muted-foreground/50")}>
                    {tag._count.posts} {tag._count.posts === 1 ? "post" : "posts"}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => { window.location.href = `/admin/tags/${tag.id}`; }}
                      title="Editar etiqueta"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag); }}
                      title={tag._count.posts > 0 ? `Eliminar (afecta a ${tag._count.posts} post${tag._count.posts !== 1 ? "s" : ""})` : "Eliminar"}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar etiqueta"
        description={
          deleteTarget && deleteTarget._count.posts > 0
            ? `¿Eliminar "${deleteTarget.name}"? Se desasignará de ${deleteTarget._count.posts} post${deleteTarget._count.posts !== 1 ? "s" : ""}. Los posts no se borrarán.`
            : `¿Eliminar la etiqueta "${deleteTarget?.name}"? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar etiqueta"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
