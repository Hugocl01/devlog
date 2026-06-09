import { useState } from "react";
import { Pencil, Trash2, Plus, Loader2, X, Check, Smile, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface ReactionTypeRow {
  id: number;
  name: string;
  emoji: string;
  label: string;
  _count: { reactions: number };
}

interface Props {
  initialTypes: ReactionTypeRow[];
}

const inputCls =
  "h-8 rounded-md border border-border/60 bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

export default function ReactionTypesTable({ initialTypes }: Props) {
  const [types, setTypes] = useState<ReactionTypeRow[]>(initialTypes);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmoji, setCreateEmoji] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ReactionTypeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const startEdit = (t: ReactionTypeRow) => {
    setEditId(t.id);
    setEditName(t.name);
    setEditEmoji(t.emoji);
    setEditLabel(t.label);
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    if (!editName.trim() || !editEmoji.trim() || !editLabel.trim()) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reaction-types/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, emoji: editEmoji, label: editLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setTypes((prev) => prev.map((t) => (t.id === editId ? { ...t, ...data.type } : t)));
      setEditId(null);
      toast.success("Tipo actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !createEmoji.trim() || !createLabel.trim()) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/reaction-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, emoji: createEmoji, label: createLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setTypes((prev) => [...prev, { ...data.type, _count: { reactions: 0 } }]);
      setCreateName("");
      setCreateEmoji("");
      setCreateLabel("");
      setShowCreate(false);
      toast.success("Tipo de reacción creado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/reaction-types/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Tipo eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {types.length} tipo{types.length !== 1 ? "s" : ""} de reacción
        </p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo tipo
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-xl border border-border/60 bg-card p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-sm font-medium mb-3">Nuevo tipo de reacción</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nombre (clave)</label>
              <input
                className={cn(inputCls, "w-full uppercase")}
                placeholder="LIKE"
                value={createName}
                onChange={(e) => setCreateName(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Emoji</label>
              <input
                className={cn(inputCls, "w-full")}
                placeholder="👍"
                value={createEmoji}
                onChange={(e) => setCreateEmoji(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Etiqueta visible</label>
              <input
                className={cn(inputCls, "w-full")}
                placeholder="Me gusta"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => { setShowCreate(false); setCreateName(""); setCreateEmoji(""); setCreateLabel(""); }}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Crear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Emoji</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etiqueta</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Usos</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {types.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No hay tipos de reacción.
                </td>
              </tr>
            )}
            {types.map((t) =>
              editId === t.id ? (
                <tr key={t.id} className="bg-secondary/10">
                  <td className="px-4 py-2">
                    <input
                      className={cn(inputCls, "w-28 uppercase")}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={cn(inputCls, "w-20")}
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={cn(inputCls, "w-40")}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell" />
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        title="Guardar"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-secondary/40 p-1.5">
                        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-mono text-xs font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xl">{t.emoji}</td>
                  <td className="px-4 py-3 text-sm">{t.label}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      t._count.reactions > 0
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-secondary/50 text-muted-foreground border border-border/40"
                    )}>
                      {t._count.reactions.toLocaleString("es-ES")} uso{t._count.reactions !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {t._count.reactions > 0 && (
                        <button
                          onClick={() => { window.location.href = `/admin/reaction-types/${t.id}`; }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Ver usuarios que han reaccionado"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(t)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        disabled={t._count.reactions > 0}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t._count.reactions > 0 ? "No se puede eliminar: tiene reacciones" : "Eliminar"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar tipo "${deleteTarget?.name}"`}
        description={`¿Seguro que quieres eliminar el tipo de reacción "${deleteTarget?.label}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar tipo"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
