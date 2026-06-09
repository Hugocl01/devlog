import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
  loading = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <DialogClose asChild>
            <button
              disabled={loading}
              className="flex-1 sm:flex-none rounded-full border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all disabled:opacity-60"
            >
              Cancelar
            </button>
          </DialogClose>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 sm:flex-none rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-all disabled:opacity-60"
          >
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
