import { useState } from "react";
import { ArrowLeft, Tag, Save, Loader2, Trash2, FileText, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

interface PostEntry {
  post: {
    slug: string;
    title: string;
    publishedAt: string | null;
    draft: boolean;
  };
}

interface TagData {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  posts: PostEntry[];
}

const DEFAULT_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#06b6d4",
];

function toSlug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const inputCls = "h-10 w-full rounded-lg border border-border/60 bg-secondary/20 px-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";
const labelCls = "text-xs font-medium text-muted-foreground uppercase tracking-wide";

export default function TagDetailView({ tag }: { tag: TagData }) {
  const [name, setName] = useState(tag.name);
  const [slug, setSlug] = useState(tag.slug);
  const [slugCustomized, setSlugCustomized] = useState(true);
  const [color, setColor] = useState(tag.color ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Baseline guardado — se actualiza tras cada save para que isDirty refleje el estado real
  const [savedName, setSavedName] = useState(tag.name);
  const [savedSlug, setSavedSlug] = useState(tag.slug);
  const [savedColor, setSavedColor] = useState(tag.color ?? "");

  const currentSlug = slugCustomized ? slug : toSlug(name);
  const isDirty = name !== savedName || currentSlug !== savedSlug || color !== savedColor;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = currentSlug.trim();
    if (!trimmedName) { toast.error("El nombre no puede estar vacío"); return; }
    if (!trimmedSlug) { toast.error("El slug no puede estar vacío"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, slug: trimmedSlug, color: color || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedName(trimmedName);
      setSavedSlug(trimmedSlug);
      setSavedColor(color);
      toast.success("Etiqueta guardada", { duration: 2500 });
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Etiqueta eliminada");
      window.location.href = "/admin/tags";
    } catch (err) {
      toast.error("No se pudo eliminar", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => { window.location.href = "/admin/tags"; }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a etiquetas
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
          <button
            type="submit"
            form="tag-form"
            disabled={saving || !isDirty}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main form */}
        <form id="tag-form" onSubmit={handleSave} className="space-y-6">

          {/* Nombre + Slug */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Identificación</h2>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="ej: JavaScript"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Slug *</label>
                {slugCustomized && currentSlug !== toSlug(name) && (
                  <button
                    type="button"
                    onClick={() => { setSlugCustomized(false); setSlug(""); }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    ↺ sincronizar con nombre
                  </button>
                )}
              </div>
              <input
                type="text"
                value={currentSlug}
                onChange={(e) => { setSlug(e.target.value); setSlugCustomized(true); }}
                className={cn(inputCls, "font-mono")}
                placeholder="ej: javascript"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL: <code className="bg-secondary/40 px-1 rounded">/tags/{currentSlug || "…"}/</code>
              </p>
            </div>
          </div>

          {/* Color */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold">Color</h2>

            {/* Preview */}
            <div className="flex items-center gap-3">
              {color ? (
                <>
                  <span
                    className="inline-block h-8 w-8 rounded-lg border border-border/40 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border"
                    style={{ backgroundColor: `${color}20`, borderColor: `${color}50`, color }}
                  >
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    {name || "Etiqueta"}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{color}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sin color asignado</span>
              )}
            </div>

            {/* Picker */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={color || "#3b82f6"}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border/60 bg-background p-0.5"
              />
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setColor("")}
                  title="Sin color"
                  className={cn(
                    "h-6 w-6 rounded-full border-2 bg-muted/60 flex items-center justify-center text-muted-foreground/60 transition-transform hover:scale-110",
                    !color ? "border-foreground scale-110" : "border-transparent"
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Sidebar — posts con esta etiqueta */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6">
          <h2 className="text-sm font-semibold mb-4">
            Posts con esta etiqueta
            <span className="ml-2 text-xs font-normal text-muted-foreground">({tag.posts.length})</span>
          </h2>

          {tag.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún post usa esta etiqueta.</p>
          ) : (
            <ul className="space-y-2">
              {tag.posts.map(({ post }) => (
                <li key={post.slug}>
                  <a
                    href={`/admin/posts/${post.slug}/edit`}
                    className="flex items-start gap-2 rounded-lg p-2 hover:bg-secondary/40 transition-colors group"
                  >
                    <div className="mt-0.5 rounded-md bg-secondary/40 p-1 shrink-0">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {post.draft ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                            <EyeOff className="h-2.5 w-2.5" /> Borrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Eye className="h-2.5 w-2.5" />
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar etiqueta"
        description={
          tag.posts.length > 0
            ? `¿Eliminar "${name}"? Se desasignará de ${tag.posts.length} post${tag.posts.length !== 1 ? "s" : ""}. Los posts no se borrarán.`
            : `¿Eliminar la etiqueta "${name}"? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar etiqueta"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
