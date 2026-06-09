import { useState, useEffect, useRef } from "react";
import { getCurrentUser, type ClientUser } from "@/lib/auth-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Reply, Send, MessageSquare, ShieldOff, ShieldCheck, UserX, Pencil, X, Check } from "lucide-react";

interface CommentUser {
  id: string;
  name: string;
  avatar: string | null;
  banned?: boolean;
}

interface CommentData {
  id: string;
  content: string;
  deleted: boolean;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies: CommentData[];
  parentId?: string | null;
}

interface Props {
  postSlug: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function CommentForm({
  onSubmit,
  placeholder = "Escribe un comentario...",
  autoFocus = false,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar el comentario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        disabled={submitting}
        className="w-full resize-none rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-60"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/60">{content.length}/2000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3 w-3" />
            {submitting ? "Enviando..." : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  user,
  onReply,
  onDelete,
  onToggleBan,
  onBanUser,
  onEdit,
  isReply = false,
}: {
  comment: CommentData;
  user: ClientUser | null;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleBan: (id: string, banned: boolean) => Promise<void>;
  onBanUser: (userId: string, userName: string, currentBanned: boolean) => Promise<void>;
  onEdit: (id: string, newContent: string) => void;
  isReply?: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banning, setBanning] = useState(false);
  const [banningUser, setBanningUser] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.roleId === 2;
  const isOwner = user?.id === comment.user.id;
  const canDelete = user && (isOwner || isAdmin);
  const EDIT_WINDOW = 15 * 60 * 1000;
  const canEdit = isOwner && !comment.deleted && !comment.banned &&
    (Date.now() - new Date(comment.createdAt).getTime()) < EDIT_WINDOW;
  const isEdited = comment.updatedAt !== comment.createdAt;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.trim() === comment.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onEdit(comment.id, data.comment.content);
      setEditing(false);
      toast.success("Comentario editado", { duration: 2000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setConfirmOpen(false);
    try {
      await onDelete(comment.id);
      toast.success("Comentario eliminado", { duration: 2500 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el comentario");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleBan = async () => {
    setBanning(true);
    try {
      await onToggleBan(comment.id, comment.banned);
      toast.success(comment.banned ? "Comentario restaurado" : "Comentario ocultado", {
        description: comment.banned ? "Ya es visible públicamente." : "Oculto para los lectores.",
        duration: 3000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setBanning(false);
    }
  };

  const handleBanUser = async () => {
    setBanningUser(true);
    try {
      await onBanUser(comment.user.id, comment.user.name, comment.user.banned ?? false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al banear usuario");
    } finally {
      setBanningUser(false);
    }
  };

  if (comment.deleted) {
    return (
      <div className={cn("flex flex-col gap-4", isReply && "ml-10")}>
        <div className="flex gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-secondary/30 border border-border/40" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground/50 italic py-2">
              [Comentario eliminado]
            </p>
          </div>
        </div>
        {comment.replies.length > 0 && (
          <div className="flex flex-col gap-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                user={user}
                onReply={onReply}
                onDelete={onDelete}
                onToggleBan={onToggleBan}
                onBanUser={onBanUser}
                onEdit={onEdit}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div id={`comment-${comment.id}`} className={cn("flex gap-3", isReply && "ml-10", comment.banned && isAdmin && "rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 -mx-3")}>
      <Avatar size="sm" className="shrink-0 mt-0.5">
        {comment.user.avatar && <AvatarImage src={comment.user.avatar} alt={comment.user.name} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {getInitials(comment.user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground/60">{formatDate(comment.createdAt)}</span>
          {comment.banned && isAdmin && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
              <ShieldOff className="h-2.5 w-2.5" /> oculto
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              maxLength={2000}
              autoFocus
              className="w-full resize-none rounded-xl border border-primary/40 bg-secondary/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground/50">{editContent.length}/2000</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setEditing(false); setEditContent(comment.content); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-3 w-3" /> {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap wrap-break-word">
            {comment.content}
            {isEdited && <span className="ml-1.5 text-[10px] text-muted-foreground/50">(editado)</span>}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {!isReply && user && !comment.banned && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <Reply className="h-3 w-3" />
              Responder
            </button>
          )}
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleToggleBan}
              disabled={banning}
              className={cn(
                "inline-flex items-center gap-1 text-xs transition-colors disabled:opacity-50",
                comment.banned
                  ? "text-green-600 dark:text-green-400 hover:text-green-700"
                  : "text-muted-foreground/70 hover:text-orange-500"
              )}
            >
              {comment.banned
                ? <><ShieldCheck className="h-3 w-3" /> Restaurar</>
                : <><ShieldOff className="h-3 w-3" /> Ocultar</>}
            </button>
          )}
          {isAdmin && !comment.user.banned && comment.user.id !== user?.id && (
            <button
              onClick={handleBanUser}
              disabled={banningUser}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-red-500 transition-colors disabled:opacity-50"
              title={`Banear a ${comment.user.name}`}
            >
              <UserX className="h-3 w-3" />
              Banear usuario
            </button>
          )}
          {isAdmin && comment.user.banned && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-500/70">
              <UserX className="h-3 w-3" /> usuario baneado
            </span>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
          )}
        </div>

        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              placeholder={`Responder a ${comment.user.name}...`}
              autoFocus
              onSubmit={async (content) => {
                await onReply(comment.id, content);
                setShowReplyForm(false);
              }}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {!isReply && comment.replies.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                user={user}
                onReply={onReply}
                onDelete={onDelete}
                onToggleBan={onToggleBan}
                onBanUser={onBanUser}
                onEdit={onEdit}
                isReply
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar comentario"
        description="Esta acción no se puede deshacer. El comentario quedará marcado como eliminado."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

export default function CommentsSection({ postSlug }: Props) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${postSlug}/comments`).then((r) => r.json()),
      getCurrentUser(),
    ]).then(([data, u]) => {
      setComments(data.comments ?? []);
      setUser(u);
      setLoading(false);
      setReady(true);
    });
  }, [postSlug]);

  const addComment = async (content: string) => {
    const res = await fetch(`/api/posts/${postSlug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al publicar");
    setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
  };

  const addReply = async (parentId: string, content: string) => {
    const res = await fetch(`/api/posts/${postSlug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al publicar");

    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, data.comment] } : c
      )
    );
  };

  const deleteComment = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al eliminar");
    }
    const markDeleted = (list: CommentData[]): CommentData[] =>
      list.map((c) =>
        c.id === id
          ? { ...c, deleted: true, content: "" }
          : { ...c, replies: markDeleted(c.replies) }
      );
    setComments((prev) => markDeleted(prev));
  };

  const banUser = async (userId: string, userName: string, currentBanned: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !currentBanned }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al banear");
    }
    // Marcar el usuario como baneado en todos sus comentarios visibles
    setComments((prev) =>
      prev.map((c) => ({
        ...c,
        user: c.user.id === userId ? { ...c.user, banned: !currentBanned } : c.user,
        replies: c.replies.map((r) => ({
          ...r,
          user: r.user.id === userId ? { ...r.user, banned: !currentBanned } : r.user,
        })),
      }))
    );
    toast.success(`${userName} ${!currentBanned ? "baneado" : "desbaneado"}`, {
      description: !currentBanned ? "Sesiones cerradas. No puede iniciar sesión." : "Puede volver a iniciar sesión.",
      duration: 4000,
    });
  };

  const editComment = (id: string, newContent: string) => {
    const updateList = (list: CommentData[]): CommentData[] =>
      list.map((c) =>
        c.id === id
          ? { ...c, content: newContent, updatedAt: new Date().toISOString() }
          : { ...c, replies: updateList(c.replies) }
      );
    setComments((prev) => updateList(prev));
  };

  const toggleBan = async (id: string, currentBanned: boolean) => {
    const res = await fetch(`/api/admin/comments/${id}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !currentBanned }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al cambiar estado");
    }
    const setBanned = (list: CommentData[]): CommentData[] =>
      list.map((c) =>
        c.id === id
          ? { ...c, banned: !currentBanned }
          : { ...c, replies: setBanned(c.replies) }
      );
    setComments((prev) => setBanned(prev));
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + (c.deleted ? 0 : 1) + c.replies.filter((r) => !r.deleted).length,
    0
  );

  return (
    <div className="max-w-3xl mx-auto mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-6">
        <MessageSquare className="h-5 w-5 text-primary/70" />
        Comentarios
        {totalCount > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {totalCount}
          </span>
        )}
      </h2>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary/40" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-32 rounded bg-secondary/40" />
                <div className="h-3 w-full rounded bg-secondary/40" />
                <div className="h-3 w-2/3 rounded bg-secondary/40" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {ready && user && (
            <div className="mb-8">
              <CommentForm onSubmit={addComment} placeholder="Deja tu comentario..." />
            </div>
          )}

          {ready && !user && (
            <div className="mb-8 rounded-xl border border-border/60 bg-secondary/20 px-5 py-4 text-sm text-muted-foreground">
              <a href="/auth/login" className="font-medium text-primary hover:underline">Inicia sesión</a>{" "}
              para dejar un comentario.
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 text-center py-6">
              Sé el primero en comentar.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  user={user}
                  onReply={addReply}
                  onDelete={deleteComment}
                  onToggleBan={toggleBan}
                  onBanUser={banUser}
                  onEdit={editComment}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
