import { useState } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Setting {
  key: string;
  value: string;
  label: string;
  description: string | null;
}

interface Props {
  initialSettings: Setting[];
}

const inputCls =
  "h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Identidad del sitio", keys: ["site_name", "site_description", "site_author"] },
  { label: "Redes sociales", keys: ["social_github", "social_twitter", "social_linkedin"] },
  { label: "Contacto", keys: ["contact_email"] },
];

export default function SettingsEditor({ initialSettings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, s.value]))
  );
  const [original, setOriginal] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState(false);

  const byKey = Object.fromEntries(initialSettings.map((s) => [s.key, s]));
  const dirty = Object.entries(values).some(([k, v]) => v !== original[k]);

  const handleSave = async () => {
    const updates = Object.entries(values)
      .filter(([k, v]) => v !== original[k])
      .map(([key, value]) => ({ key, value }));

    if (updates.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setOriginal({ ...values });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues({ ...original });
    toast.info("Cambios descartados");
  };

  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const groupSettings = group.keys.map((k) => byKey[k]).filter(Boolean);
        if (groupSettings.length === 0) return null;
        return (
          <div key={group.label} className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/50 bg-secondary/20 px-5 py-3">
              <h2 className="text-sm font-semibold">{group.label}</h2>
            </div>
            <div className="divide-y divide-border/40">
              {groupSettings.map((s) => (
                <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-start">
                  <div>
                    <label htmlFor={s.key} className="block text-sm font-medium">
                      {s.label}
                    </label>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <input
                      id={s.key}
                      type="text"
                      className={cn(inputCls, values[s.key] !== original[s.key] && "border-primary/60")}
                      value={values[s.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-3 pt-2">
        {dirty && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Descartar cambios
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
