import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string; // datetime-local ISO (YYYY-MM-DDTHH:mm) or ""
  onChange: (value: string) => void;
  minDate?: Date;
  className?: string;
}

export function DateTimePicker({ value, onChange, minDate, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Si el valor lleva timezone (termina en Z o ±HH:mm), new Date() lo interpreta correctamente.
  // Si es un formato datetime-local sin tz (YYYY-MM-DDTHH:mm), el navegador lo trata como hora local —
  // ambos casos son correctos: el primero al cargar desde DB (UTC explícito), el segundo al
  // editar localmente desde el picker.
  const selected = value ? new Date(value) : undefined;
  const hours = selected ? selected.getHours() : 12;
  const minutes = selected ? selected.getMinutes() : 0;

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const next = setMinutes(setHours(day, hours), minutes);
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (h: number, m: number) => {
    const base = selected ?? new Date();
    const next = setMinutes(setHours(base, h), m);
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-secondary/20 px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground",
            selected && "text-foreground",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {selected
            ? format(selected, "d MMM yyyy, HH:mm", { locale: es })
            : "Programar publicación…"}
          {selected && (
            <span
              role="button"
              onClick={clear}
              className="ml-1 rounded hover:text-destructive"
              aria-label="Limpiar fecha"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleDaySelect}
          disabled={minDate ? { before: minDate } : undefined}
          locale={es}
          initialFocus
        />

        {/* Time selector */}
        <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Hora:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={String(hours).padStart(2, "0")}
            onChange={(e) => handleTimeChange(Math.min(23, Math.max(0, Number(e.target.value))), minutes)}
            className="w-12 rounded border border-border/60 bg-secondary/20 px-2 py-1 text-center text-xs outline-none focus:border-ring"
            aria-label="Hora"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="number"
            min={0}
            max={59}
            step={5}
            value={String(minutes).padStart(2, "0")}
            onChange={(e) => handleTimeChange(hours, Math.min(59, Math.max(0, Number(e.target.value))))}
            className="w-12 rounded border border-border/60 bg-secondary/20 px-2 py-1 text-center text-xs outline-none focus:border-ring"
            aria-label="Minutos"
          />
          {selected && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Confirmar
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
