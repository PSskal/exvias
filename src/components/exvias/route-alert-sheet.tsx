"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Ambulance,
  ChevronLeft,
  CircleAlert,
  MapPinned,
  Send,
  ShieldAlert,
  Siren,
  Trash2,
  TrafficCone,
  X,
  type LucideIcon,
} from "lucide-react";
import type { RouteAlertType } from "@/lib/generated/prisma/client";
import { clearRouteAlertAction, reportRouteAlertAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  RouteMapCanvas,
  svgIconHtml,
  type LatLngLiteral,
  type MapMarkerPoint,
  type RouteMapPoint,
} from "./route-point-map-picker";

const ALERT_TYPES: Array<{
  value: RouteAlertType;
  label: string;
  Icon: LucideIcon;
  colorClass: string;
  color: string;
}> = [
  { value: "CONTROL_POLICIAL", label: "Control policial", Icon: Siren, colorClass: "text-[#1E5BFF]", color: "#1E5BFF" },
  { value: "OPERATIVO", label: "Operativo", Icon: ShieldAlert, colorClass: "text-[#E53935]", color: "#E53935" },
  { value: "ACCIDENTE", label: "Accidente", Icon: Ambulance, colorClass: "text-[#E53935]", color: "#E53935" },
  { value: "TRAFICO", label: "Tráfico", Icon: TrafficCone, colorClass: "text-[#F4B400]", color: "#F4B400" },
  { value: "OTRO", label: "Otro", Icon: CircleAlert, colorClass: "text-slate-500", color: "#64748b" },
];

function alertTypeInfo(type: RouteAlertType) {
  return ALERT_TYPES.find((option) => option.value === type) ?? ALERT_TYPES[4];
}

// Datos crudos de los íconos (extraídos de lucide-react) para dibujarlos como
// SVG plano dentro del marcador del mapa. No usamos los componentes React de
// lucide-react ahí porque el marcador es un nodo del DOM normal (no React) y
// renderToStaticMarkup choca con el render del lado del servidor de Next.
const ICON_NODES: Record<RouteAlertType, Array<[string, Record<string, string | number>]>> = {
  CONTROL_POLICIAL: [
    ["path", { d: "M7 18v-6a5 5 0 1 1 10 0v6" }],
    ["path", { d: "M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" }],
    ["path", { d: "M21 12h1" }],
    ["path", { d: "M18.5 4.5 18 5" }],
    ["path", { d: "M2 12h1" }],
    ["path", { d: "M12 2v1" }],
    ["path", { d: "m4.929 4.929.707.707" }],
    ["path", { d: "M12 12v6" }],
  ],
  OPERATIVO: [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
    ["path", { d: "M12 8v4" }],
    ["path", { d: "M12 16h.01" }],
  ],
  ACCIDENTE: [
    ["path", { d: "M10 10H6" }],
    ["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }],
    [
      "path",
      {
        d: "M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14",
      },
    ],
    ["path", { d: "M8 8v4" }],
    ["path", { d: "M9 18h6" }],
    ["circle", { cx: 17, cy: 18, r: 2 }],
    ["circle", { cx: 7, cy: 18, r: 2 }],
  ],
  TRAFICO: [
    ["path", { d: "M16.05 10.966a5 2.5 0 0 1-8.1 0" }],
    [
      "path",
      {
        d: "m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04",
      },
    ],
    ["path", { d: "M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z" }],
    ["path", { d: "M9.194 6.57a5 2.5 0 0 0 5.61 0" }],
  ],
  OTRO: [
    ["circle", { cx: 12, cy: 12, r: 10 }],
    ["line", { x1: 12, x2: 12, y1: 8, y2: 12 }],
    ["line", { x1: 12, x2: 12.01, y1: 16, y2: 16 }],
  ],
};

const DRAFT_PIN_NODES: Array<[string, Record<string, string | number>]> = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
    },
  ],
  ["circle", { cx: 12, cy: 10, r: 3 }],
];

function markerIconHtml(type: RouteAlertType) {
  const info = alertTypeInfo(type);
  return svgIconHtml(ICON_NODES[type], info.color);
}

const DRAFT_PIN_ICON = svgIconHtml(DRAFT_PIN_NODES, "#94a3b8");

function timeAgo(date: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}

export type ExistingRouteAlert = {
  id: string;
  type: RouteAlertType;
  latitude: number;
  longitude: number;
  note: string | null;
  createdAt: Date;
  createdByName: string;
  isOwn: boolean;
};

export function RouteAlertSheet({
  routeId,
  backHref,
  points,
  alerts,
  initialViewAlertId,
}: {
  routeId: string;
  backHref: string;
  points: RouteMapPoint[];
  alerts: ExistingRouteAlert[];
  initialViewAlertId?: string | null;
}) {
  const [draftPosition, setDraftPosition] = useState<LatLngLiteral | null>(null);
  const [selectedType, setSelectedType] = useState<RouteAlertType | null>(null);
  const [viewingAlertId, setViewingAlertId] = useState<string | null>(
    initialViewAlertId ?? null,
  );

  const viewingAlert = alerts.find((alert) => alert.id === viewingAlertId) ?? null;

  const startNewReport = (position: LatLngLiteral) => {
    setViewingAlertId(null);
    setDraftPosition(position);
    setSelectedType(null);
  };

  const extraMarkers: MapMarkerPoint[] = useMemo(
    () =>
      alerts.map((alert) => ({
        id: alert.id,
        position: { lat: alert.latitude, lng: alert.longitude },
        iconHtml: markerIconHtml(alert.type),
        highlighted: alert.id === viewingAlertId,
        pulse: true,
        onClick: () => {
          setDraftPosition(null);
          setSelectedType(null);
          setViewingAlertId(alert.id);
        },
      })),
    [alerts, viewingAlertId],
  );

  const draftPin: MapMarkerPoint | null = draftPosition
    ? {
        id: "draft",
        position: draftPosition,
        iconHtml: selectedType ? markerIconHtml(selectedType) : DRAFT_PIN_ICON,
        highlighted: true,
      }
    : null;

  const focusTarget = viewingAlert
    ? {
        position: { lat: viewingAlert.latitude, lng: viewingAlert.longitude },
        key: viewingAlert.id,
      }
    : null;

  const canSubmit = Boolean(draftPosition && selectedType);

  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-slate-200">
      <RouteMapCanvas
        points={points}
        boardablePointIds={[]}
        selectedPointId={null}
        onSelectPoint={() => {}}
        onMapClick={startNewReport}
        draftPin={draftPin}
        extraMarkers={extraMarkers}
        focusTarget={focusTarget}
        bottomInsetPx={360}
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
        <div className="pointer-events-auto rounded-full bg-white/95 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur">
          {alerts.length === 0
            ? "Sin alertas activas"
            : `${alerts.length} alerta${alerts.length === 1 ? "" : "s"} activa${alerts.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Ficha inferior */}
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(15,23,42,0.18)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

        {viewingAlert ? (
          <AlertDetail
            alert={viewingAlert}
            onClose={() => setViewingAlertId(null)}
          />
        ) : (
          <>
            <h2 className="text-xl font-black text-slate-950">Reportar en la ruta</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {draftPosition
                ? "Elige qué tipo de alerta es."
                : "Toca el mapa donde está la alerta, o toca un pin para verlo."}
            </p>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {ALERT_TYPES.map((option) => {
                const isSelected = option.value === selectedType;
                const Icon = option.Icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!draftPosition}
                    onClick={() => setSelectedType(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-center transition disabled:opacity-40",
                      isSelected
                        ? "bg-[#073FEA] text-white shadow-[0_10px_24px_rgba(7,63,234,0.30)]"
                        : "bg-slate-100 text-slate-600 active:bg-slate-200",
                    )}
                  >
                    <Icon className={cn("size-5", isSelected ? "text-white" : option.colorClass)} />
                    <span className="text-[10px] font-black leading-tight">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <form action={reportRouteAlertAction} className="mt-4">
              <input type="hidden" name="routeId" value={routeId} />
              <input type="hidden" name="type" value={selectedType ?? ""} />
              <input type="hidden" name="latitude" value={draftPosition?.lat ?? ""} />
              <input type="hidden" name="longitude" value={draftPosition?.lng ?? ""} />

              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-13 w-full rounded-full bg-[#073FEA] text-base font-black shadow-[0_14px_30px_rgba(7,63,234,0.30)] hover:bg-[#0633b8]"
              >
                <MapPinned className="size-4" />
                Reportar alerta
                <Send className="size-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AlertDetail({
  alert,
  onClose,
}: {
  alert: ExistingRouteAlert;
  onClose: () => void;
}) {
  const info = alertTypeInfo(alert.type);
  const Icon = info.Icon;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1E5BFF]/8">
            <Icon className={cn("size-6", info.colorClass)} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">{info.label}</h2>
            <p className="text-xs font-semibold text-slate-500">
              {timeAgo(alert.createdAt)}
              {alert.isOwn ? " · Reportada por ti" : ` · ${alert.createdByName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
        >
          <X className="size-4" />
        </button>
      </div>

      {alert.note ? (
        <p className="mt-3 rounded-[12px] bg-[#F5F7FA] p-3 text-sm font-semibold text-slate-600">
          {alert.note}
        </p>
      ) : null}

      {alert.isOwn ? (
        <form action={clearRouteAlertAction} className="mt-4">
          <input type="hidden" name="alertId" value={alert.id} />
          <Button
            type="submit"
            variant="outline"
            className="h-12 w-full rounded-full border-[#E53935]/40 font-black text-[#E53935] hover:bg-[#E53935]/10 hover:text-[#E53935]"
          >
            <Trash2 className="size-4" />
            Quitar esta alerta
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          Toca el mapa para reportar una nueva alerta.
        </p>
      )}
    </div>
  );
}
