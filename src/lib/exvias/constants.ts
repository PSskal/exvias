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

export const vehicleCatalog = [
  {
    id: "avanza-rojo",
    name: "Toyota Avanza rojo",
    shortName: "Avanza rojo",
    image: "/cars/transparent/avanzarojo-transparent.png",
  },
  {
    id: "avanza-verde",
    name: "Toyota Avanza verde",
    shortName: "Avanza verde",
    image: "/cars/transparent/avanzaverde-transparent.png",
  },
  {
    id: "avanza-negro",
    name: "Toyota Avanza negro",
    shortName: "Avanza negro",
    image: "/cars/transparent/avanzanegro-transparent.png",
  },
] as const;

export type VehicleCatalogId = (typeof vehicleCatalog)[number]["id"];

export function getVehicleOption(vehicleName?: string | null) {
  return (
    vehicleCatalog.find((vehicle) => vehicle.id === vehicleName) ??
    vehicleCatalog.find((vehicle) => vehicle.name === vehicleName) ??
    vehicleCatalog[0]
  );
}

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
  SUBMITTED: "Yape en revisión",
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

export function passengerReservationStatus(input: {
  bookingStatus: BookingStatus;
  paymentStatus?: PaymentStatus | null;
}) {
  if (input.bookingStatus === BookingStatus.CANCELLED) {
    return {
      label: "Cancelado",
      title: "Reserva cancelada",
      description: "Esta reserva ya no está activa.",
      tone: "danger" as const,
    };
  }

  if (input.bookingStatus === BookingStatus.NO_SHOW) {
    return {
      label: "No se presentó",
      title: "No se presentó",
      description: "El pasajero no abordó el vehículo.",
      tone: "danger" as const,
    };
  }

  if (input.bookingStatus === BookingStatus.BOARDED) {
    return {
      label: "Abordado",
      title: "Pasajero abordó",
      description: "El pasajero ya fue marcado como abordado.",
      tone: "neutral" as const,
    };
  }

  if (input.paymentStatus === PaymentStatus.APPROVED) {
    return {
      label: "Adelanto confirmado",
      title: "Asiento asegurado",
      description: "El conductor confirmó que recibió tu Yape.",
      tone: "success" as const,
    };
  }

  if (input.paymentStatus === PaymentStatus.SUBMITTED) {
    return {
      label: "Yape en revisión",
      title: "Esperando confirmación del Yape",
      description: "Tu captura fue enviada. El conductor debe confirmar el pago.",
      tone: "warning" as const,
    };
  }

  if (input.paymentStatus === PaymentStatus.REJECTED) {
    return {
      label: "Pago rechazado",
      title: "Pago rechazado",
      description: "El comprobante fue rechazado. Comunícate con EXVIASS.",
      tone: "danger" as const,
    };
  }

  return {
    label: "Pago pendiente",
    title: "Falta enviar comprobante",
    description: "Sube la captura del Yape para solicitar tu reserva.",
    tone: "warning" as const,
  };
}

export const defaultRoutePoints: Record<
  RouteDirection,
  Array<{
    name: string;
    minuteOffset: number;
    latitude: number;
    longitude: number;
    isTerminal?: boolean;
  }>
> = {
  CUSCO_TO_COLQUEPATA: [
    {
      name: "Control San Jerónimo",
      minuteOffset: 0,
      latitude: -13.5445072,
      longitude: -71.8840606,
      isTerminal: true,
    },
    {
      name: "Paradero Kayra",
      minuteOffset: 10,
      latitude: -13.547,
      longitude: -71.862,
    },
    {
      name: "Punto carretera km 12",
      minuteOffset: 25,
      latitude: -13.483,
      longitude: -71.839,
    },
    {
      name: "Punto carretera km 35",
      minuteOffset: 55,
      latitude: -13.421,
      longitude: -71.755,
    },
    {
      name: "Colquepata",
      minuteOffset: 95,
      latitude: -13.3602317,
      longitude: -71.6733928,
      isTerminal: true,
    },
  ],
  COLQUEPATA_TO_CUSCO: [
    {
      name: "Colquepata",
      minuteOffset: 0,
      latitude: -13.3602317,
      longitude: -71.6733928,
      isTerminal: true,
    },
    {
      name: "Punto carretera km 35",
      minuteOffset: 40,
      latitude: -13.421,
      longitude: -71.755,
    },
    {
      name: "Punto carretera km 12",
      minuteOffset: 70,
      latitude: -13.483,
      longitude: -71.839,
    },
    {
      name: "Paradero Kayra",
      minuteOffset: 85,
      latitude: -13.547,
      longitude: -71.862,
    },
    {
      name: "Control San Jerónimo",
      minuteOffset: 95,
      latitude: -13.5445072,
      longitude: -71.8840606,
      isTerminal: true,
    },
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
