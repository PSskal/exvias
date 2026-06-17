import {
  BookingStatus,
  PaymentStatus,
  QueueStatus,
  RouteDirection,
  TripStatus,
} from "@/lib/generated/prisma/client";

export const EXVIASS = {
  farePen: 15,
  depositPen: 7.5,
  dueOnBoardingPen: 7.5,
  vehicleCapacity: 7,
  minimumDeparture: 4,
} as const;

export const routeDirectionLabels: Record<RouteDirection, string> = {
  CUSCO_TO_COLQUEPATA: "Cusco a Colquepata",
  COLQUEPATA_TO_CUSCO: "Colquepata a Cusco",
};

export const routeDirectionShortLabels: Record<RouteDirection, string> = {
  CUSCO_TO_COLQUEPATA: "Cusco",
  COLQUEPATA_TO_CUSCO: "Colquepata",
};

export const routeDirectionDestinationLabels: Record<RouteDirection, string> = {
  CUSCO_TO_COLQUEPATA: "Colquepata",
  COLQUEPATA_TO_CUSCO: "Cusco",
};

export const tripStatusLabels: Record<TripStatus, string> = {
  QUEUED: "En cola",
  ACTIVE: "Activo",
  BOARDING: "Embarcando",
  DEPARTED: "En ruta",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  PAID_PARTIAL: "Adelanto pagado",
  BOARDED: "Abordado",
  NO_SHOW: "No se presentó",
  CANCELLED: "Cancelado",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  SUBMITTED: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const queueStatusLabels: Record<QueueStatus, string> = {
  WAITING: "En espera",
  ASSIGNED: "Asignado",
  SKIPPED: "Omitido",
  OFFLINE: "Fuera de línea",
};

export const statusLabels: Record<string, string> = {
  ...tripStatusLabels,
  ...bookingStatusLabels,
  ...paymentStatusLabels,
  ...queueStatusLabels,
};

export const defaultRoutePoints: Record<
  RouteDirection,
  Array<{ name: string; minuteOffset: number; isTerminal?: boolean }>
> = {
  CUSCO_TO_COLQUEPATA: [
    { name: "Terminal Cusco", minuteOffset: 0, isTerminal: true },
    { name: "Wanchaq", minuteOffset: 8 },
    { name: "San Sebastián", minuteOffset: 18 },
    { name: "Punto carretera km 12", minuteOffset: 28 },
    { name: "Terminal Colquepata", minuteOffset: 95, isTerminal: true },
  ],
  COLQUEPATA_TO_CUSCO: [
    { name: "Terminal Colquepata", minuteOffset: 0, isTerminal: true },
    { name: "Punto carretera km 12", minuteOffset: 67 },
    { name: "San Sebastián", minuteOffset: 77 },
    { name: "Wanchaq", minuteOffset: 87 },
    { name: "Terminal Cusco", minuteOffset: 95, isTerminal: true },
  ],
};

export function formatPen(value: number | string | { toString(): string }) {
  return `S/ ${Number(value.toString()).toFixed(2)}`;
}

export function formatTime(date?: Date | null) {
  if (!date) return "--:--";

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date?: Date | null) {
  if (!date) return "Sin fecha";

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}
