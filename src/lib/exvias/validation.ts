import { z } from "zod";
import { BookingStatus, PaymentStatus, RouteDirection, TripStatus } from "@/lib/generated/prisma/client";
import { vehicleCatalog } from "@/lib/exvias/constants";

const vehicleIds = vehicleCatalog.map((vehicle) => vehicle.id) as [
  string,
  ...string[],
];

export const directionSchema = z.enum([
  RouteDirection.CUSCO_TO_COLQUEPATA,
  RouteDirection.COLQUEPATA_TO_CUSCO,
]);

export const createTurnSchema = z.object({
  routeId: z.string().min(1),
  direction: directionSchema,
  plannedDepartureAt: z.string().optional(),
});

export const bookingSchema = z.object({
  tripId: z.string().min(1),
  boardingPointId: z.string().min(1),
  passengerName: z.string().trim().min(2, "Ingresa tu nombre"),
  passengerPhone: z.string().trim().min(6, "Ingresa un celular válido"),
});

export const paymentProofSchema = z
  .object({
    bookingId: z.string().min(1).optional(),
    tripId: z.string().min(1).optional(),
    boardingPointId: z.string().min(1).optional(),
    passengerName: z.string().trim().min(2, "Ingresa tu nombre").optional(),
    passengerPhone: z
      .string()
      .trim()
      .min(6, "Ingresa un celular válido")
      .optional(),
    proofUrl: z.string().trim().min(1, "Adjunta la captura del comprobante"),
  })
  .refine((input) => input.bookingId || input.tripId, {
    message: "Falta la reserva o el turno",
  })
  .refine(
    (input) =>
      Boolean(input.bookingId) ||
      Boolean(
        input.tripId &&
          input.boardingPointId &&
          input.passengerName &&
          input.passengerPhone,
      ),
    {
      message: "Faltan datos para crear la reserva",
    },
  );

export const approvePaymentSchema = z.object({
  paymentId: z.string().min(1),
});

export const rejectPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().max(160).optional(),
});

export const updateTripStatusSchema = z.object({
  tripId: z.string().min(1),
  status: z.enum([
    TripStatus.QUEUED,
    TripStatus.ACTIVE,
    TripStatus.BOARDING,
    TripStatus.DEPARTED,
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
  ]),
  adminOverride: z.coerce.boolean().optional(),
});

export const updateBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum([
    BookingStatus.RESERVED,
    BookingStatus.CONFIRMED,
    BookingStatus.PAID_PARTIAL,
    BookingStatus.BOARDED,
    BookingStatus.NO_SHOW,
    BookingStatus.CANCELLED,
  ]),
});

export const driverTripStatusSchema = z.object({
  tripId: z.string().min(1),
  status: z.enum([
    TripStatus.BOARDING,
    TripStatus.DEPARTED,
    TripStatus.COMPLETED,
  ]),
});

export const driverBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum([BookingStatus.BOARDED, BookingStatus.NO_SHOW]),
});

export const paymentStatusSchema = z.enum([
  PaymentStatus.PENDING,
  PaymentStatus.SUBMITTED,
  PaymentStatus.APPROVED,
  PaymentStatus.REJECTED,
]);

export const joinDriverQueueSchema = z.object({
  routeId: z.string().min(1),
  direction: directionSchema,
  driverId: z.string().min(1),
});

export const enterOwnDriverQueueSchema = z.object({
  routeId: z.string().min(1),
  direction: directionSchema,
});

export const joinOwnDriverQueueSchema = z.object({
  routeId: z.string().min(1),
  direction: directionSchema,
});

export const assignDriverToTripSchema = z.object({
  tripId: z.string().min(1),
  driverId: z.string().min(1),
});

export const saveScheduleBoardSchema = z.object({
  assignments: z.array(
    z.object({
      tripId: z.string().min(1),
      driverId: z.string().min(1),
    }),
  ),
  orders: z.array(
    z.object({
      direction: directionSchema,
      tripIds: z.array(z.string().min(1)),
    }),
  ),
});

export const saveRampQueuesSchema = z.object({
  routeId: z.string().min(1),
  queues: z.array(
    z.object({
      direction: directionSchema,
      driverIds: z.array(z.string().min(1)),
    }),
  ),
});

export const publishNextRampTurnSchema = z.object({
  routeId: z.string().min(1),
  direction: directionSchema,
});

export const upsertDriverProfileSchema = z.object({
  userId: z.string().min(1),
  phone: z.string().trim().optional(),
  yapePhone: z.string().trim().min(6, "Ingresa el número Yape"),
  yapeName: z.string().trim().min(2, "Ingresa el titular del Yape"),
  licensePlate: z.string().trim().min(2, "Ingresa la placa"),
  vehicleName: z.enum(vehicleIds),
});

export const activateDriverProfileSchema = z.object({
  userId: z.string().min(1),
});

export const updateDriverActiveStateSchema = z.object({
  driverId: z.string().min(1),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const suspendDriverAfterTripSchema = z.object({
  driverId: z.string().min(1),
  reason: z.string().trim().max(180).optional(),
});

export const cancelDriverCurrentTripSchema = z.object({
  driverId: z.string().min(1),
  reason: z.string().trim().max(180).optional(),
});

export const reassignDriverCurrentTripSchema = z.object({
  driverId: z.string().min(1),
  replacementDriverId: z.string().min(1),
  reason: z.string().trim().max(180).optional(),
});

export const updateDriverVehicleSchema = z.object({
  vehicleName: z.enum(vehicleIds),
});

export const updateOwnDriverSettingsSchema = z.object({
  phone: z.string().trim().optional(),
  yapePhone: z.string().trim().min(6, "Ingresa el número Yape"),
  yapeName: z.string().trim().min(2, "Ingresa el titular del Yape"),
  licensePlate: z.string().trim().min(2, "Ingresa la placa"),
  vehicleName: z.enum(vehicleIds),
});

export const updateManualSeatsSchema = z.object({
  tripId: z.string().min(1),
  delta: z.coerce.number().int().min(-1).max(1),
});
