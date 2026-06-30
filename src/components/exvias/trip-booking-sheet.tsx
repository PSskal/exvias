"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { reserveSeatAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouteMapCanvas, type RouteMapPoint } from "./route-point-map-picker";

// No se importa desde "@/lib/exvias/constants" porque ese módulo carga los
// enums generados por Prisma a nivel de archivo, lo que arrastra código de
// Node (fs, crypto) al bundle del navegador en un componente cliente.
function formatPen(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function pointTime(point: RouteMapPoint, plannedDepartureAtIso?: string | null) {
  if (!plannedDepartureAtIso) return `+${point.minuteOffset} min`;

  const date = new Date(
    new Date(plannedDepartureAtIso).getTime() + point.minuteOffset * 60_000,
  );

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TripBookingSheet({
  tripId,
  backHref,
  points,
  boardablePointIds,
  plannedDepartureAtIso,
  turnLabel,
  remainingSeats,
  capacity,
  userName,
  passengerPhone,
  farePen,
  depositPen,
}: {
  tripId: string;
  backHref: string;
  points: RouteMapPoint[];
  boardablePointIds: string[];
  plannedDepartureAtIso?: string | null;
  turnLabel: string;
  remainingSeats: number;
  capacity: number;
  userName: string;
  passengerPhone: string;
  farePen: number;
  depositPen: number;
}) {
  const boardablePoints = useMemo(
    () => points.filter((point) => boardablePointIds.includes(point.id)),
    [points, boardablePointIds],
  );

  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    boardablePoints.find((point) => !point.isTerminal)?.id ??
      boardablePoints[0]?.id ??
      null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedPoint = points.find((point) => point.id === selectedPointId);
  const isFull = remainingSeats <= 0;

  // Mide el alto real de la ficha inferior para que el mapa sepa cuánto
  // espacio le tapa y pueda centrar la ruta/punto en el área visible.
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState(320);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setSheetHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-slate-200">
      <RouteMapCanvas
        points={points}
        boardablePointIds={boardablePointIds}
        selectedPointId={selectedPointId}
        onSelectPoint={setSelectedPointId}
        bottomInsetPx={sheetHeight}
        className="absolute inset-0 z-0"
      />

      {/* Barra flotante superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
        <Link
          href={backHref}
          className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur"
          aria-label="Volver"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur">
          <span className="text-[#073FEA]">{turnLabel}</span>
          <span className="text-slate-300">·</span>
          <span className={cn(isFull ? "text-[#E53935]" : "text-slate-600")}>
            {isFull ? "Turno lleno" : `${remainingSeats}/${capacity} cupos`}
          </span>
        </div>
      </div>

      {/* Ficha inferior: paso 1, elegir punto de embarque */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-20 rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Paso 1 de 2
        </p>
        <h2 className="mt-0.5 text-xl font-black text-slate-950">
          ¿Dónde subes?
        </h2>

        <div className="mt-4 -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {boardablePoints.map((point) => {
            const isSelected = point.id === selectedPointId;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => setSelectedPointId(point.id)}
                className={cn(
                  "flex shrink-0 flex-col items-start gap-0.5 rounded-2xl px-4 py-2.5 text-left transition",
                  isSelected
                    ? "bg-[#1E5BFF] text-white shadow-[0_10px_24px_rgba(30,91,255,0.30)]"
                    : "bg-slate-100 text-slate-700 active:bg-slate-200",
                )}
              >
                <span className="text-sm font-black">{point.name}</span>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    isSelected ? "text-white/80" : "text-slate-400",
                  )}
                  suppressHydrationWarning
                >
                  Paso aprox: {pointTime(point, plannedDepartureAtIso)}
                </span>
              </button>
            );
          })}
        </div>

        {selectedPoint ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#1E5BFF]/8 p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1E5BFF] text-white">
              <MapPin className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">
                {selectedPoint.name}
              </p>
              <p className="text-xs font-semibold text-slate-500" suppressHydrationWarning>
                Pasa aprox a las {pointTime(selectedPoint, plannedDepartureAtIso)}
              </p>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!selectedPointId || isFull}
          onClick={() => setDetailsOpen(true)}
          className="mt-4 h-13 w-full rounded-full bg-[#073FEA] text-base font-black shadow-[0_14px_30px_rgba(7,63,234,0.30)] hover:bg-[#0633b8]"
        >
          {isFull ? "Turno lleno" : "Continuar"}
          {!isFull && <ChevronRight className="size-4" />}
        </Button>
      </div>

      {/* Paso 2: modal con datos del pasajero y resumen de pago */}
      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        {/* Sin Dialog.Portal: así el modal queda anclado dentro del marco del
            celular (vía position: absolute) en vez de escaparse a <body>,
            que rompería el recorte del frame en la versión de escritorio. */}
        <Dialog.Overlay className="absolute inset-0 z-40 bg-slate-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="absolute inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                  Paso 2 de 2
                </p>
                <Dialog.Title className="mt-0.5 text-xl font-black text-slate-950">
                  Confirma tu reserva
                </Dialog.Title>
              </div>
              <Dialog.Close
                className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Completa tus datos y revisa el resumen de pago para confirmar tu
              reserva.
            </Dialog.Description>

            <form action={reserveSeatAction} className="mt-4 space-y-5">
              <input type="hidden" name="tripId" value={tripId} />
              <input
                type="hidden"
                name="boardingPointId"
                value={selectedPointId ?? ""}
              />

              {selectedPoint ? (
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#1E5BFF]/8 p-3 text-left"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1E5BFF] text-white">
                    <MapPin className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">
                      {selectedPoint.name}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Punto de embarque · Cambiar
                    </p>
                  </div>
                </button>
              ) : null}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <UserRound className="size-5 text-[#073FEA]" />
                  <h3 className="font-black text-slate-950">Datos del pasajero</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="passengerName">Nombre</Label>
                    <Input
                      id="passengerName"
                      name="passengerName"
                      defaultValue={userName}
                      required
                      minLength={2}
                      pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+"
                      title="Ingresa solo nombres y apellidos"
                      className="h-11 rounded-[10px] bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengerPhone">Celular peruano</Label>
                    <Input
                      id="passengerPhone"
                      name="passengerPhone"
                      defaultValue={passengerPhone}
                      required
                      maxLength={9}
                      minLength={9}
                      pattern="9[0-9]{8}"
                      placeholder="987654321"
                      title="Ingresa un celular peruano de 9 dígitos que empiece con 9"
                      inputMode="tel"
                      autoComplete="tel-national"
                      className="h-11 rounded-[10px] bg-slate-50"
                    />
                    <p className="text-xs font-semibold text-slate-500">
                      Debe tener 9 dígitos y empezar con 9.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="size-5 text-[#073FEA]" />
                  <h3 className="font-black text-slate-950">Resumen de pago</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pasaje</span>
                    <strong>{formatPen(farePen)}</strong>
                  </div>
                  <div className="flex justify-between rounded-[12px] bg-[#F4B400]/15 px-3 py-3">
                    <span className="font-black text-[#B37B00]">
                      Adelanto 50%
                    </span>
                    <strong className="text-[#B37B00]">
                      {formatPen(depositPen)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Saldo al abordar</span>
                    <strong>{formatPen(farePen - depositPen)}</strong>
                  </div>
                </div>
              </div>

              <Button
                className="h-13 w-full rounded-full bg-[#12B85F] text-base font-black shadow-[0_14px_30px_rgba(18,184,95,0.30)] hover:bg-[#10a957]"
                disabled={isFull}
              >
                <MapPin className="size-4" />
                Continuar con mi reserva
              </Button>
            </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
