import { useState, useMemo, useEffect, useRef } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  Loader2, Eye, EyeOff, Save, Trash2, Calendar,
  Bold, Italic, Link2, Code, FileCode2, Heading2, Heading3, Quote, List,
  ChevronDown, Search,
} from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export interface UpdateEditorData {
  slug?: string;
  title: string;
  description: string;
  content: string;
  authorId?: string;
  type: "feature" | "bugfix" | "improvement" | "general";
  draft: boolean;
  scheduledAt?: string;
  metaTitle?: string;
  canonical?: string;
}

export interface AdminUser {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: UpdateEditorData;
  users?: AdminUser[];
}

const TYPE_OPTIONS = [
  { value: "feature",     label: "Nueva función" },
  { value: "bugfix",      label: "Corrección de error" },
  { value: "improvement", label: "Mejora" },
  { value: "general",     label: "General" },
] as const;

export default function UpdateEditor({ mode, initialData, users = [] }: Props) {
  const storageKey = `update-draft-${initialData?.slug ?? "new"}`;

  const getSaved = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { return null; }
  };

  // Una sola lectura de localStorage en el mount
  const [saved] = useState(getSaved);

  const [title, setTitle] = useState(saved?.title ?? initialData?.title ?? "");
  const [description, setDescription] = useState(saved?.description ?? initialData?.description ?? "");
  const [content, setContent] = useState(saved?.content ?? initialData?.content ?? "");
  const [authorId, setAuthorId] = useState(initialData?.authorId ?? users[0]?.id ?? "");
  const [type, setType] = useState<string>(saved?.type ?? initialData?.type ?? "general");
  const [draft, setDraft] = useState(saved?.draft ?? initialData?.draft ?? true);
  const [scheduledAt, setScheduledAt] = useState(saved?.scheduledAt ?? initialData?.scheduledAt ?? "");
  const [metaTitle, setMetaTitle] = useState(saved?.metaTitle ?? initialData?.metaTitle ?? "");
  const [canonical, setCanonical] = useState(saved?.canonical ?? initialData?.canonical ?? "");
  const [seoOpen, setSeoOpen] = useState(!!(initialData?.metaTitle || initialData?.canonical));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saved">(saved ? "saved" : "idle");
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(saved ? new Date() : null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAutoSaveStatus("pending");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ title, description, content, type, draft, scheduledAt, metaTitle, canonical }));
      setAutoSaveStatus("saved");
      setAutoSavedAt(new Date());
    }, 30_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [title, description, content, type, draft, scheduledAt, metaTitle, canonical]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const insertMarkdown = (prefix: string, suffix = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const inserted = `${prefix}${selected}${suffix}`;
    const next = `${before}${inserted}${after}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cur = start + prefix.length + selected.length;
      el.setSelectionRange(cur, cur);
    });
  };

  const previewHtml = useMemo(() => marked.parse(content) as string, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !content.trim()) {
      setSubmitAttempted(true);
      toast.error("Campos obligatorios incompletos", {
        description: "Rellena los campos marcados en rojo.",
        duration: 4000,
      });
      return;
    }

    setSaving(true);
    const isScheduled = !draft && scheduledAt && new Date(scheduledAt) > new Date();
    const payload = {
      title, description, content,
      authorId: authorId || undefined,
      type, draft,
      scheduledAt: isScheduled ? scheduledAt : undefined,
      metaTitle: metaTitle.trim() || undefined,
      canonical: canonical.trim() || undefined,
    };
    const url = mode === "create" ? "/api/admin/updates" : `/api/admin/updates/${initialData!.slug}`;
    const method = mode === "create" ? "POST" : "PUT";

    const p = fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.error ?? "Error desconocido"); return d; });

    toast.promise(p, {
      loading: mode === "create" ? "Creando update..." : "Guardando cambios...",
      success: mode === "create" ? "Update creado correctamente" : "Cambios guardados",
      error: (err) => err instanceof Error ? err.message : "Error al guardar",
    });

    try {
      const data = await p;
      localStorage.removeItem(storageKey);
      if (mode === "create") window.location.href = `/admin/updates/${data.slug}/edit`;
    } catch {
      // error shown by toast.promise
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setConfirmDelete(false);
    const p = fetch(`/api/admin/updates/${initialData!.slug}`, { method: "DELETE" })
      .then(async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.error ?? "Error al eliminar"); return d; });

    toast.promise(p, {
      loading: "Eliminando update...",
      success: "Update eliminado",
      error: (err) => err instanceof Error ? err.message : "Error al eliminar",
    });

    try {
      await p;
      window.location.href = "/admin/updates";
    } catch {
      setDeleting(false);
    }
  };

  const field = "flex flex-col gap-1.5";
  const label = "text-xs font-medium text-muted-foreground uppercase tracking-wide";
  const input = "h-9 w-full rounded-lg border border-border/60 bg-secondary/20 px-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 placeholder:text-muted-foreground/40";
  const textarea = "w-full rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 placeholder:text-muted-foreground/40 resize-none";
  const errorBorder = "border-red-500/60 bg-red-500/5 focus-visible:border-red-500/60 focus-visible:ring-red-500/20";

  function formatAutoSaveTime(d: Date) {
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return "hace un momento";
    if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
    return `hace ${Math.floor(sec / 3600)} h`;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setDraft(!draft); if (!draft) setScheduledAt(""); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              draft
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                : scheduledAt && new Date(scheduledAt) > new Date()
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                  : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}
          >
            {draft ? <EyeOff className="h-3.5 w-3.5" /> : scheduledAt && new Date(scheduledAt) > new Date() ? <Calendar className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {draft ? "Borrador" : scheduledAt && new Date(scheduledAt) > new Date() ? "Programado" : "Publicado"}
          </button>

          {!draft && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground/70 whitespace-nowrap">Publicar el:</span>
              <DateTimePicker
                value={scheduledAt}
                onChange={setScheduledAt}
                minDate={new Date()}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="h-9 px-4 rounded-full border border-border/60 bg-secondary/30 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            {preview ? "Editor" : "Vista previa"}
          </button>
          <span className="text-xs text-muted-foreground/60 hidden sm:inline">
            {autoSaveStatus === "pending" && "• Guardando…"}
            {autoSaveStatus === "saved" && autoSavedAt && `✓ Guardado ${formatAutoSaveTime(autoSavedAt)}`}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {mode === "create" ? "Crear update" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-4">
          <div className={field}>
            <label className={label}>
              Título *
              {submitAttempted && !title.trim() && <span className="ml-1 normal-case text-red-500 font-normal">— requerido</span>}
            </label>
            <input
              type="text"
              className={cn(input, submitAttempted && !title.trim() && errorBorder)}
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (submitAttempted) setSubmitAttempted(false); }}
              placeholder="Título del update"
            />
          </div>

          <div className={field}>
            <label className={label}>
              Descripción *
              {submitAttempted && !description.trim() && <span className="ml-1 normal-case text-red-500 font-normal">— requerido</span>}
            </label>
            <textarea
              className={cn(textarea, "min-h-18", submitAttempted && !description.trim() && errorBorder)}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve del update"
              rows={3}
            />
          </div>

          <div className={field}>
            <div className="flex items-center justify-between">
              <label className={label}>Contenido * (Markdown)</label>
              <span className="text-[10px] text-muted-foreground/60">
                {content.trim()
                  ? `~${Math.max(1, Math.round(content.trim().split(/\s+/).length / 200))} min de lectura`
                  : preview ? "Vista previa" : ""}
              </span>
            </div>
            {!preview && (
              <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-border/60 bg-secondary/30 px-2 py-1.5">
                {([
                  { icon: <Heading2 className="h-3.5 w-3.5" />, title: "Encabezado H2", fn: () => insertMarkdown("\n## ", "", "Encabezado") },
                  { icon: <Heading3 className="h-3.5 w-3.5" />, title: "Encabezado H3", fn: () => insertMarkdown("\n### ", "", "Subencabezado") },
                  { icon: null },
                  { icon: <Bold className="h-3.5 w-3.5" />, title: "Negrita", fn: () => insertMarkdown("**", "**", "negrita") },
                  { icon: <Italic className="h-3.5 w-3.5" />, title: "Cursiva", fn: () => insertMarkdown("*", "*", "cursiva") },
                  { icon: null },
                  { icon: <Link2 className="h-3.5 w-3.5" />, title: "Enlace", fn: () => insertMarkdown("[", "](https://)", "texto") },
                  { icon: <Code className="h-3.5 w-3.5" />, title: "Código inline", fn: () => insertMarkdown("`", "`", "código") },
                  { icon: <FileCode2 className="h-3.5 w-3.5" />, title: "Bloque de código", fn: () => insertMarkdown("\n```\n", "\n```\n", "código") },
                  { icon: null },
                  { icon: <Quote className="h-3.5 w-3.5" />, title: "Cita", fn: () => insertMarkdown("\n> ", "", "cita") },
                  { icon: <List className="h-3.5 w-3.5" />, title: "Lista", fn: () => insertMarkdown("\n- ", "", "elemento") },
                ] as Array<{ icon: React.ReactNode | null; title?: string; fn?: () => void }>).map((btn, i) =>
                  btn.icon === null
                    ? <span key={i} className="mx-1 h-4 w-px self-center bg-border/60" />
                    : <button key={i} type="button" title={btn.title} aria-label={btn.title} onClick={btn.fn}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                        {btn.icon}
                      </button>
                )}
              </div>
            )}
            {preview ? (
              <div
                className="min-h-125 rounded-lg border border-border/60 bg-secondary/10 px-4 py-3 prose prose-sm dark:prose-invert max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className={cn(textarea, "min-h-125 rounded-t-none font-mono text-xs leading-relaxed")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="## Cambios&#10;&#10;Escribe aquí el contenido en Markdown..."
                rows={24}
                required
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className={field}>
            <label className={label}>Tipo</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 border-border/60 bg-secondary/20 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={field}>
            <label className={label}>Autor</label>
            {users.length > 0 ? (
              <Select value={authorId} onValueChange={setAuthorId}>
                <SelectTrigger className="h-9 border-border/60 bg-secondary/20 text-sm">
                  <SelectValue placeholder="Seleccionar autor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">Sin usuarios admin disponibles</p>
            )}
          </div>

          {mode === "edit" && initialData?.slug && (
            <div className={field}>
              <label className={label}>Slug</label>
              <input
                type="text"
                className={cn(input, "text-muted-foreground cursor-default")}
                value={initialData.slug}
                readOnly
              />
            </div>
          )}
        </div>
      </div>

      {/* SEO section */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4 text-muted-foreground" />
            SEO
            {(metaTitle || canonical) && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {[metaTitle && "título", canonical && "canonical"].filter(Boolean).join(", ")}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", seoOpen && "rotate-180")} />
        </button>
        {seoOpen && (
          <div className="p-4 flex flex-col gap-4 border-t border-border/40">
            <div className={field}>
              <label htmlFor="meta-title" className={label}>
                Meta title <span className="normal-case font-normal text-muted-foreground/60">(override del título en buscadores)</span>
              </label>
              <input
                id="meta-title"
                type="text"
                className={input}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "Deja vacío para usar el título del update"}
                maxLength={60}
              />
              <span className={cn("text-xs self-end tabular-nums", metaTitle.length > 55 ? "text-amber-500" : "text-muted-foreground/50")}>
                {metaTitle.length}/60
              </span>
            </div>
            <div className={field}>
              <label htmlFor="canonical" className={label}>
                URL canónica <span className="normal-case font-normal text-muted-foreground/60">(si el contenido existe en otra URL)</span>
              </label>
              <input
                id="canonical"
                type="url"
                className={input}
                value={canonical}
                onChange={(e) => setCanonical(e.target.value)}
                placeholder="https://ejemplo.com/update-original"
              />
            </div>

            {/* Google snippet preview */}
            <div className={field}>
              <span className={label}>Vista previa en buscadores</span>
              <div className="rounded-lg border border-border/60 bg-background p-4 font-sans">
                <p className="text-[13px] text-[#1a0dab] dark:text-[#8ab4f8] font-medium leading-snug truncate">
                  {metaTitle || title || "Título del update"}
                </p>
                <p className="text-[12px] text-[#006621] dark:text-[#34a853] mt-0.5 truncate">
                  {typeof window !== "undefined" ? window.location.origin : "https://tusitio.com"}/updates/{initialData?.slug ?? "slug-del-update"}
                </p>
                <p className={cn("text-[13px] text-[#545454] dark:text-[#bdc1c6] mt-0.5 line-clamp-2 leading-snug", !description && "italic opacity-50")}>
                  {description || "Descripción del update (rellena el campo descripción)"}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-right">
                Título: {(metaTitle || title).length}/60 · Descripción: {description.length}/160
              </p>
            </div>
          </div>
        )}
      </div>

      {mode === "edit" && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar update"
          description={`"${title}" se eliminará permanentemente. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar update"
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </form>
  );
}
