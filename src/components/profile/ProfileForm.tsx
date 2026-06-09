import { useState, useEffect, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, KeyRound, Mail, Camera, Monitor, Smartphone, Globe, Trash2, LogOut, TriangleAlert, Download, ChevronDown, Loader2, Upload, X } from "lucide-react";
import { clearUserCache } from "@/lib/auth-client";
import { toast } from "sonner";

interface InitialUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  roleId: number;
  emailChangePending: string | null;
}

interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface Props {
  user: InitialUser;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function parseDevice(ua: string | null) {
  if (!ua) return { label: "Dispositivo desconocido", icon: "globe" as const };
  const u = ua.toLowerCase();
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone"))
    return { label: "Dispositivo móvil", icon: "mobile" as const };
  if (u.includes("tablet") || u.includes("ipad"))
    return { label: "Tablet", icon: "mobile" as const };
  return { label: "Ordenador", icon: "desktop" as const };
}

function parseBrowser(ua: string | null) {
  if (!ua) return "Navegador desconocido";
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Navegador desconocido";
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days !== 1 ? "s" : ""}`;
}

function inputClass(disabled?: boolean) {
  return `dark:bg-input/30 border-input h-10 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`;
}

const DeviceIcon = ({ type }: { type: "mobile" | "desktop" | "globe" }) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (type === "desktop") return <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />;
};

export default function ProfileForm({ user: initial }: Props) {
  const [user, setUser] = useState(initial);

  // ── Email change feedback from query params ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("email_change");
    if (!result) return;
    if (result === "success") toast.success("Email actualizado", { description: "Tu nuevo email ya está activo." });
    else if (result === "expired") toast.error("Enlace caducado", { description: "El enlace de confirmación ha expirado. Solicita el cambio de nuevo." });
    else if (result === "invalid") toast.error("Enlace inválido", { description: "El enlace no es válido o ya fue usado." });
    else if (result === "taken") toast.error("Email ya registrado", { description: "Ese correo ya está en uso por otra cuenta. La solicitud ha sido cancelada." });
    else toast.error("Error al confirmar el email");
    // Clean the query param without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete("email_change");
    window.history.replaceState({}, "", url.toString());
  }, []);

  // ── Info ──────────────────────────────────────────────────────────────────
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar ?? "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setAvatarUrl(data.url);
      toast.success("Imagen lista. Guarda los cambios para aplicarla.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoSaving(true);
    const p = fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio: bio || null, avatar: avatarUrl || null }),
    }).then(async (res) => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al guardar");
      return d;
    });

    toast.promise(p, {
      loading: "Guardando perfil...",
      success: "Perfil actualizado",
      error: (err) => err.message,
    });

    try {
      const data = await p;
      setUser(data.user);
      clearUserCache();
    } catch {
      // shown by toast
    } finally {
      setInfoSaving(false);
    }
  };

  // ── Email change ──────────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailPwd, setEmailPwd] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    const p = fetch("/api/profile/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, password: emailPwd }),
    }).then(async (res) => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al solicitar el cambio");
      return d;
    });

    toast.promise(p, {
      loading: "Enviando confirmación...",
      success: `Hemos enviado un enlace de confirmación a ${newEmail}`,
      error: (err) => err.message,
    });

    try {
      await p;
      setNewEmail(""); setEmailPwd("");
    } catch {
      // shown by toast
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Password ──────────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const pwdStrength = (() => {
    if (!newPwd) return -1;
    let score = 0;
    if (newPwd.length >= 8) score++;
    if (newPwd.length >= 12) score++;
    if (/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd)) score++;
    if (/[0-9]/.test(newPwd) && /[^A-Za-z0-9]/.test(newPwd)) score++;
    return Math.min(score, 3);
  })();

  const strengthLevels = [
    { label: "Muy débil", barColors: ["bg-destructive", "bg-border", "bg-border", "bg-border"] },
    { label: "Débil",     barColors: ["bg-orange-500", "bg-orange-500", "bg-border", "bg-border"] },
    { label: "Aceptable", barColors: ["bg-yellow-500", "bg-yellow-500", "bg-yellow-500", "bg-border"] },
    { label: "Fuerte",    barColors: ["bg-green-500",  "bg-green-500",  "bg-green-500",  "bg-green-500"] },
  ];

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setPwdSaving(true);
    const p = fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    }).then(async (res) => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al cambiar contraseña");
      return d;
    });

    toast.promise(p, {
      loading: "Actualizando contraseña...",
      success: "Contraseña actualizada correctamente",
      error: (err) => err.message,
    });

    try {
      await p;
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      // shown by toast
    } finally {
      setPwdSaving(false);
    }
  };

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/profile/sessions");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("No se pudieron cargar las sesiones");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch("/api/profile/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Sesión cerrada", { duration: 2500 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar la sesión");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllSessions = async () => {
    setRevokingAll(true);
    const p = fetch("/api/profile/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).then(async (res) => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    });

    toast.promise(p, {
      loading: "Cerrando otras sesiones...",
      success: "Todas las otras sesiones cerradas",
      error: (err) => err.message,
    });

    try {
      await p;
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      // shown by toast
    } finally {
      setRevokingAll(false);
    }
  };

  // ── Export data ───────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/profile/export");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Error al exportar los datos");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "mis-datos.json";
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Datos exportados correctamente");
    } catch {
      toast.error("Error al exportar los datos");
    } finally {
      setExporting(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const [deleteConfirmPwd, setDeleteConfirmPwd] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== "eliminar mi cuenta") {
      toast.error("Escribe el texto de confirmación exacto");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deleteConfirmPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al eliminar la cuenta");
      toast.success("Cuenta eliminada", { description: "Tus datos han sido suprimidos." });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la cuenta");
      setDeleting(false);
    }
  };

  const initials = getInitials(user.name);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-12 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !uploadingAvatar && avatarFileRef.current?.click()}
          className="relative cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
          title="Cambiar foto de perfil"
        >
          <Avatar className="size-16!">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary border-2 border-background group-hover:bg-primary/80 transition-colors">
            {uploadingAvatar
              ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
              : <Camera className="h-3 w-3 text-primary-foreground" />}
          </div>
        </button>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary/70" />
          <h2 className="text-base font-semibold">Información personal</h2>
        </div>
        <form onSubmit={saveInfo} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Nombre</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              maxLength={100} required disabled={infoSaving} className={inputClass(infoSaving)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
            <input id="email" type="email" value={user.email} disabled className={inputClass(true)}
              title="El correo no se puede cambiar" />
            <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio <span className="text-muted-foreground font-normal">({bio.length}/500)</span>
            </label>
            <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500}
              rows={3} disabled={infoSaving} placeholder="Cuéntanos algo sobre ti..."
              className={`dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none ${infoSaving ? "opacity-60 cursor-not-allowed" : ""}`} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Foto de perfil</label>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP · máx. 5 MB. También puedes hacer clic en tu foto de arriba.</p>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleAvatarFileUpload}
            />
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploadingAvatar || infoSaving}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm hover:bg-secondary/50 disabled:opacity-50 transition-colors"
              >
                {uploadingAvatar
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Upload className="h-3.5 w-3.5" />}
                {uploadingAvatar ? "Subiendo..." : "Subir foto"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  disabled={infoSaving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Eliminar foto
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={infoSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {infoSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* Email change card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-primary/70" />
          <h2 className="text-base font-semibold">Cambiar correo electrónico</h2>
        </div>
        {user.emailChangePending && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            Cambio pendiente de confirmación en <strong>{user.emailChangePending}</strong>. Revisa tu bandeja de entrada.
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-4">
          Recibirás un enlace de confirmación en el nuevo correo. El cambio no se aplicará hasta que lo confirmes.
        </p>
        <form onSubmit={changeEmail} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-email" className="text-sm font-medium">Nuevo correo electrónico</label>
            <input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              required disabled={emailSaving} placeholder="nuevo@email.com" className={inputClass(emailSaving)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email-pwd" className="text-sm font-medium">Contraseña actual</label>
            <input id="email-pwd" type="password" value={emailPwd} onChange={(e) => setEmailPwd(e.target.value)}
              required disabled={emailSaving} placeholder="••••••••" className={inputClass(emailSaving)} />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={emailSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {emailSaving ? "Enviando..." : "Solicitar cambio"}
            </button>
          </div>
        </form>
      </div>

      {/* Password card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound className="h-5 w-5 text-primary/70" />
          <h2 className="text-base font-semibold">Cambiar contraseña</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="current-pwd" className="text-sm font-medium">Contraseña actual</label>
            <input id="current-pwd" type={showPwd ? "text" : "password"} value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)} required disabled={pwdSaving}
              placeholder="••••••••" className={inputClass(pwdSaving)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-pwd" className="text-sm font-medium">Nueva contraseña</label>
            <input id="new-pwd" type={showPwd ? "text" : "password"} value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} required disabled={pwdSaving}
              placeholder="••••••••" className={inputClass(pwdSaving)} />
            {newPwd && pwdStrength >= 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-1">
                  {strengthLevels[pwdStrength].barColors.map((color, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${color}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{strengthLevels[pwdStrength].label}</p>
              </div>
            )}
            {!newPwd && <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, una mayúscula y un número.</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-pwd" className="text-sm font-medium">Confirmar nueva contraseña</label>
            <input id="confirm-pwd" type={showPwd ? "text" : "password"} value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} required disabled={pwdSaving}
              placeholder="••••••••" className={inputClass(pwdSaving)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="show-pwd" checked={showPwd} onCheckedChange={(checked) => setShowPwd(checked === true)} />
            <label htmlFor="show-pwd" className="text-sm text-muted-foreground cursor-pointer select-none">
              Mostrar contraseñas
            </label>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={pwdSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {pwdSaving ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>

      {/* Sessions card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary/70" />
            <h2 className="text-base font-semibold">Sesiones activas</h2>
          </div>
          {otherSessions.length > 0 && (
            <button onClick={revokeAllSessions} disabled={revokingAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50">
              <LogOut className="h-3 w-3" />
              Cerrar otras sesiones
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay sesiones activas.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => {
              const device = parseDevice(session.userAgent);
              const browser = parseBrowser(session.userAgent);
              return (
                <li key={session.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${session.isCurrent ? "border-primary/30 bg-primary/5" : "border-border/50 bg-secondary/10"}`}>
                  <DeviceIcon type={device.icon} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{browser}</span>
                      {session.isCurrent && (
                        <span className="rounded-full bg-primary/15 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Sesión actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {device.label}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                      {" · "}{formatRelative(session.createdAt)}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <button onClick={() => revokeSession(session.id)} disabled={revokingId === session.id}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Cerrar esta sesión">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Exportar datos (Art. 20 RGPD) */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Mis datos</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Descarga una copia de todos tus datos personales en formato JSON: perfil, comentarios, reacciones y sesiones.
          Este derecho está reconocido en el <strong className="text-foreground">artículo 20 del RGPD</strong>.
        </p>
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-primary/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exportando..." : "Descargar mis datos"}
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDeleteZone((v) => !v)}
          aria-expanded={showDeleteZone}
          className="flex w-full items-center gap-3 p-6 text-left transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-inset"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
            <TriangleAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-destructive/90">Zona de peligro</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Acciones permanentes e irreversibles</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDeleteZone ? "rotate-180" : ""}`}
          />
        </button>

        {showDeleteZone && (
          <div className="border-t border-destructive/20 px-6 pb-6 pt-5 space-y-5">
            <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <TriangleAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Eliminar tu cuenta es una acción <strong className="text-foreground">permanente e irreversible</strong>.
                Tus datos personales serán suprimidos y tus comentarios quedarán anonimizados.
              </p>
            </div>

            <form onSubmit={deleteAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="delete-pwd" className="text-sm font-medium">
                  Confirma tu contraseña
                </label>
                <input
                  id="delete-pwd"
                  type="password"
                  value={deleteConfirmPwd}
                  onChange={(e) => setDeleteConfirmPwd(e.target.value)}
                  required
                  disabled={deleting}
                  placeholder="••••••••"
                  className={inputClass(deleting)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="delete-confirm" className="text-sm font-medium">
                  Escribe{" "}
                  <code className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive font-mono text-xs">
                    eliminar mi cuenta
                  </code>{" "}
                  para confirmar
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                  disabled={deleting}
                  placeholder="eliminar mi cuenta"
                  className={inputClass(deleting)}
                />
              </div>
              <button
                type="submit"
                disabled={deleting || deleteConfirmText !== "eliminar mi cuenta" || !deleteConfirmPwd}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Eliminando cuenta..." : "Eliminar mi cuenta definitivamente"}
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
