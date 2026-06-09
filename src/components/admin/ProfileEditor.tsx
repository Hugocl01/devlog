import { useState, useRef } from "react";
import { Loader2, Save, KeyRound, User, Eye, EyeOff, GitBranch, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    avatar: string | null;
    hasPassword: boolean;
    role: { name: string };
    createdAt: string;
  };
}

const inputCls =
  "h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

const textareaCls =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 resize-none";

export default function ProfileEditor({ user }: Props) {
  // Profile form
  const [name, setName]     = useState(user.name);
  const [bio, setBio]       = useState(user.bio ?? "");
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Baseline guardado — se actualiza tras cada save para que profileDirty refleje el estado real
  const [savedName, setSavedName]     = useState(user.name);
  const [savedBio, setSavedBio]       = useState(user.bio ?? "");
  const [savedAvatar, setSavedAvatar] = useState(user.avatar ?? "");

  const profileDirty = name !== savedName || bio !== savedBio || avatar !== savedAvatar;

  // Password form
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [savingPwd, setSavingPwd]     = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setAvatar(data.media.url);
      toast.success("Imagen lista. Guarda los cambios para aplicarla.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio: bio || null, avatar: avatar || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setSavedName(name);
      setSavedBio(bio);
      setSavedAvatar(avatar);
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("Rellena todos los campos de contraseña");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      toast.success("Contraseña actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setSavingPwd(false);
    }
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header card */}
      <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 overflow-hidden text-xl font-bold">
          {avatar
            ? <img src={avatar} alt={name} className="h-full w-full object-cover" />
            : name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-lg leading-tight">{name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {user.role.name}
            </span>
            <span className="text-xs text-muted-foreground">Desde {joinDate}</span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="border-b border-border/50 bg-secondary/20 px-5 py-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Información personal</h2>
        </div>
        <div className="divide-y divide-border/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-start">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Nombre</label>
              <p className="text-xs text-muted-foreground mt-0.5">Nombre visible en el blog</p>
            </div>
            <div className="md:col-span-2">
              <input
                id="name"
                type="text"
                className={cn(inputCls, name !== savedName && "border-primary/60")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-start">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <p className="text-xs text-muted-foreground mt-0.5">No editable desde aquí</p>
            </div>
            <div className="md:col-span-2">
              <input
                id="email"
                type="email"
                className={cn(inputCls, "opacity-60 cursor-not-allowed")}
                value={user.email}
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-start">
            <div>
              <label htmlFor="bio" className="block text-sm font-medium">Biografía</label>
              <p className="text-xs text-muted-foreground mt-0.5">Breve descripción pública</p>
            </div>
            <div className="md:col-span-2">
              <textarea
                id="bio"
                rows={3}
                className={cn(textareaCls, bio !== savedBio && "border-primary/60")}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Escribe algo sobre ti..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-start">
            <div>
              <label className="block text-sm font-medium">Foto de perfil</label>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP · máx. 5 MB</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <div className={cn(
                "h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 overflow-hidden text-xl font-bold ring-2 ring-offset-2 ring-offset-background transition-[ring-color]",
                avatar !== savedAvatar ? "ring-primary/60" : "ring-transparent"
              )}>
                {avatar
                  ? <img src={avatar} alt={name} className="h-full w-full object-cover" />
                  : name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm hover:bg-secondary/50 disabled:opacity-50 transition-colors"
                >
                  {uploadingAvatar
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Upload className="h-3.5 w-3.5" />}
                  {uploadingAvatar ? "Subiendo..." : "Subir foto"}
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar("")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/40 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !profileDirty}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Password form */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="border-b border-border/50 bg-secondary/20 px-5 py-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Contraseña</h2>
        </div>

        {!user.hasPassword ? (
          <div className="px-5 py-6 flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Cuenta vinculada con GitHub</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tu cuenta usa GitHub para iniciar sesión. No tienes contraseña configurada
                y no necesitas una para acceder.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-center">
                <label htmlFor="current-pwd" className="text-sm font-medium">Contraseña actual</label>
                <div className="md:col-span-2 relative">
                  <input
                    id="current-pwd"
                    type={showCurrent ? "text" : "password"}
                    className={cn(inputCls, "pr-10")}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-center">
                <label htmlFor="new-pwd" className="text-sm font-medium">Nueva contraseña</label>
                <div className="md:col-span-2 relative">
                  <input
                    id="new-pwd"
                    type={showNew ? "text" : "password"}
                    className={cn(inputCls, "pr-10")}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 py-4 items-center">
                <label htmlFor="confirm-pwd" className="text-sm font-medium">Confirmar contraseña</label>
                <div className="md:col-span-2">
                  <input
                    id="confirm-pwd"
                    type="password"
                    className={cn(
                      inputCls,
                      confirmPwd && newPwd !== confirmPwd && "border-red-500/60"
                    )}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    autoComplete="new-password"
                  />
                  {confirmPwd && newPwd !== confirmPwd && (
                    <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/40 flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingPwd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Cambiar contraseña
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
