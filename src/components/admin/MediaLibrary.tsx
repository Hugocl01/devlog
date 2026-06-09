import { useState, useRef, useCallback, useMemo } from "react";
import { Upload, Trash2, Copy, Check, Loader2, Image, X, Search, AlertTriangle, ScanSearch, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy: { name: string } | null;
}

interface Props {
  initialMedia: MediaItem[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary({ initialMedia }: Props) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orphanIds, setOrphanIds] = useState<Set<number>>(new Set());
  const [scanningOrphans, setScanningOrphans] = useState(false);
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalSize = useMemo(() => media.reduce((s, m) => s + m.size, 0), [media]);
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of media) {
      const type = m.mimeType.split("/")[1]?.toUpperCase() ?? "otro";
      map[type] = (map[type] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [media]);

  const filtered = media.filter((m) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || m.originalName.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q);
    const matchOrphan = !showOnlyOrphans || orphanIds.has(m.id);
    return matchSearch && matchOrphan;
  });

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { fail++; toast.error(`Error al subir ${file.name}`, { description: data.error }); }
        else { ok++; setMedia((prev) => [data.media, ...prev]); }
      }
      if (ok > 0) toast.success(`${ok} archivo${ok !== 1 ? "s" : ""} subido${ok !== 1 ? "s" : ""}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files);
  };

  const copyUrl = async (item: MediaItem) => {
    await navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success("URL copiada al portapapeles");
  };

  const scanOrphans = async () => {
    setScanningOrphans(true);
    try {
      const res = await fetch("/api/admin/media/orphans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      const ids = new Set<number>(data.orphanIds);
      setOrphanIds(ids);
      if (ids.size === 0) {
        toast.success("¡Sin huérfanos!", { description: "Todos los archivos están referenciados en algún post o update." });
      } else {
        toast.warning(`${ids.size} archivo${ids.size !== 1 ? "s" : ""} sin referencias`, {
          description: "Marcados en naranja. Puedes filtrarlos con el botón.",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al escanear");
    } finally {
      setScanningOrphans(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setMedia((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Archivo eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-secondary/20"
        )}
      >
        {uploading
          ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          : <Upload className="h-8 w-8 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">
          {uploading ? "Subiendo..." : "Arrastra imágenes aquí o haz clic para seleccionar"}
        </p>
        <p className="text-xs text-muted-foreground/60">JPEG, PNG, GIF, WebP, SVG · máx. 5 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {/* Stats bar */}
      {media.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Archivos</p>
            <p className="text-xl font-bold tabular-nums">{media.length}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <HardDrive className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Tamaño total</p>
            </div>
            <p className="text-xl font-bold tabular-nums">{formatBytes(totalSize)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1.5">Tipos de archivo</p>
            <div className="flex flex-wrap gap-1.5">
              {byType.map(([type, count]) => (
                <span key={type} className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/40">
                  {type} <span className="font-semibold text-foreground">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + orphan controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar archivos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowOnlyOrphans(false); }}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        <button
          onClick={scanOrphans}
          disabled={scanningOrphans}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/20 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
          title="Detectar archivos sin referencias en posts o updates"
        >
          {scanningOrphans
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ScanSearch className="h-3.5 w-3.5" />}
          Detectar huérfanos
        </button>

        {orphanIds.size > 0 && (
          <button
            onClick={() => setShowOnlyOrphans((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs font-medium transition-colors",
              showOnlyOrphans
                ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {orphanIds.size} huérfano{orphanIds.size !== 1 ? "s" : ""}
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground/60">
          {filtered.length} / {media.length}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Image className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">{search ? "Sin resultados" : "No hay archivos subidos todavía"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const isOrphan = orphanIds.has(item.id);
            return (
            <div key={item.id} className={cn(
              "group relative rounded-xl border bg-card overflow-hidden transition-colors",
              isOrphan
                ? "border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60"
                : "border-border/60 hover:border-primary/40"
            )}>
              {/* Thumbnail */}
              <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                {item.mimeType.startsWith("image/") ? (
                  <img src={item.url} alt={item.originalName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={item.originalName}>{item.originalName}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground">{formatBytes(item.size)}</p>
                  {isOrphan && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-2.5 w-2.5" /> huérfano
                    </span>
                  )}
                </div>
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => copyUrl(item)}
                  title="Copiar URL"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {copiedId === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  title="Eliminar"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar "${deleteTarget?.originalName}"`}
        description="¿Seguro que quieres eliminar este archivo? Si está siendo usado en algún post, dejará de mostrarse."
        confirmLabel="Eliminar archivo"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
