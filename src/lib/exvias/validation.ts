import { z } from "zod";
import { BookingStatus, PaymentStatus, RouteDirection, TripStatus } from "@/lib/generated/prisma/client";

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

export const paymentProofSchema = z.object({
  bookingId: z.string().min(1),
  proofUrl: z.string().trim().min(1, "Adjunta o registra el comprobante"),
});

export const approvePaymentSchema = z.object({
  paymentId: z.string().min(1),
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
