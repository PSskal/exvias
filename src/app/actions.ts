"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateDriverProfile,
  assignDriverToTrip,
  approvePayment,
  cancelDriverCurrentTrip,
  createTripTurn,
  enterOwnDriverQueue,
  joinDriverQueue,
  joinOwnDriverQueue,
  publishNextRampTurn,
  rejectPayment,
  reassignDriverCurrentTrip,
  reserveSeatWithPaymentProof,
  saveRampQueues,
  saveScheduleBoard,
  submitPaymentProof,
  suspendDriverAfterCurrentTrip,
  updateDriverBookingStatus,
  updateDriverTripStatus,
  updateDriverVehicle,
  updateDriverActiveState,
  updateManualSeats,
  updateOwnDriverSettings,
  updateTripStatus,
  upsertDriverProfile,
} from "@/lib/exvias/trips";
import {
  activateDriverProfileSchema,
  assignDriverToTripSchema,
  approvePaymentSchema,
  bookingSchema,
  cancelDriverCurrentTripSchema,
  createTurnSchema,
  driverBookingStatusSchema,
  driverTripStatusSchema,
  enterOwnDriverQueueSchema,
  joinDriverQueueSchema,
  joinOwnDriverQueueSchema,
  paymentProofSchema,
  publishNextRampTurnSchema,
  rejectPaymentSchema,
  reassignDriverCurrentTripSchema,
  saveRampQueuesSchema,
  saveScheduleBoardSchema,
  suspendDriverAfterTripSchema,
  upsertDriverProfileSchema,
  updateDriverVehicleSchema,
  updateDriverActiveStateSchema,
  updateManualSeatsSchema,
  updateOwnDriverSettingsSchema,
  updateTripStatusSchema,
} from "@/lib/exvias/validation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/admin");
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  if (dbUser?.role !== "ADMIN") {
    throw new Error("Solo un administrador puede realizar esta acción");
  }

  return dbUser;
}

export async function reserveSeatAction(formData: FormData) {
  const user = await getCurrentUser();
  const input = bookingSchema.parse({
    tripId: value(formData, "tripId"),
    boardingPointId: value(formData, "boardingPointId"),
    passengerName: value(formData, "passengerName"),
    passengerPhone: value(formData, "passengerPhone"),
  });

  if (!user) {
    redirect(`/login?callbackURL=/trip/${input.tripId}`);
  }

  const params = new URLSearchParams({
    tripId: input.tripId,
    boardingPointId: input.boardingPointId,
    passengerName: input.passengerName,
    passengerPhone: input.passengerPhone,
  });

  redirect(`/payment?${params.toString()}`);
}

export async function submitPaymentProofAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/trips");
  }

  const input = paymentProofSchema.parse({
    bookingId: value(formData, "bookingId") || undefined,
    tripId: value(formData, "tripId") || undefined,
    boardingPointId: value(formData, "boardingPointId") || undefined,
    passengerName: value(formData, "passengerName") || undefined,
    passengerPhone: value(formData, "passengerPhone") || undefined,
    proofUrl: value(formData, "proofUrl"),
  });

  const booking = input.bookingId
    ? { id: input.bookingId }
    : await reserveSeatWithPaymentProof({
        tripId: input.tripId!,
        boardingPointId: input.boardingPointId!,
        passengerName: input.passengerName!,
        passengerPhone: input.passengerPhone!,
        proofUrl: input.proofUrl,
        userId: user.id,
      });

  if (input.bookingId) {
    await submitPaymentProof({
      bookingId: input.bookingId,
      proofUrl: input.proofUrl,
    });
  }

  revalidatePath("/payment");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/trips");
  revalidatePath("/my-trips");
  redirect(`/tracking/${booking.id}`);
}

export async function approvePaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/admin");
  }

  const input = approvePaymentSchema.parse({
    paymentId: value(formData, "paymentId"),
  });

  await approvePayment(input.paymentId, user?.id);
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/my-trips");
}

export async function rejectPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = rejectPaymentSchema.parse({
    paymentId: value(formData, "paymentId"),
    reason: value(formData, "reason") || undefined,
  });

  const payment = await rejectPayment({
    paymentId: input.paymentId,
    rejectedById: user.id,
    reason: input.reason,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/trips");
  revalidatePath("/my-trips");
  revalidatePath(`/tracking/${payment.bookingId}`);
}

export async function updateTripStatusAction(formData: FormData) {
  await requireAdmin();

  const input = updateTripStatusSchema.parse({
    tripId: value(formData, "tripId"),
    status: value(formData, "status"),
    adminOverride: value(formData, "adminOverride") === "true",
  });

  await updateTripStatus(input);
  revalidatePath("/admin");
  revalidatePath("/trips");
  revalidatePath(`/trip/${input.tripId}`);
}

export async function updateDriverTripStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = driverTripStatusSchema.parse({
    tripId: value(formData, "tripId"),
    status: value(formData, "status"),
  });

  await updateDriverTripStatus({
    ...input,
    userId: user.id,
  });

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/trips");
  revalidatePath(`/trip/${input.tripId}`);
}

export async function updateDriverBookingStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = driverBookingStatusSchema.parse({
    bookingId: value(formData, "bookingId"),
    status: value(formData, "status"),
  });

  await updateDriverBookingStatus({
    ...input,
    userId: user.id,
  });

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/my-trips");
}

export async function updateDriverVehicleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = updateDriverVehicleSchema.parse({
    vehicleName: value(formData, "vehicleName"),
  });

  await updateDriverVehicle({
    userId: user.id,
    vehicleName: input.vehicleName,
  });

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/trips");
}

export async function updateOwnDriverSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/account/settings");
  }

  const input = updateOwnDriverSettingsSchema.parse({
    phone: value(formData, "phone") || undefined,
    yapePhone: value(formData, "yapePhone"),
    yapeName: value(formData, "yapeName"),
    licensePlate: value(formData, "licensePlate"),
    vehicleName: value(formData, "vehicleName"),
  });

  await updateOwnDriverSettings({
    ...input,
    userId: user.id,
  });

  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/trips");
  redirect("/driver?settings=saved");
}

export async function updateManualSeatsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = updateManualSeatsSchema.parse({
    tripId: value(formData, "tripId"),
    delta: value(formData, "delta"),
  });

  await updateManualSeats({
    ...input,
    userId: user.id,
  });

  revalidatePath("/driver");
  revalidatePath("/trips");
  revalidatePath(`/trip/${input.tripId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
}

export async function createTripTurnAction(formData: FormData) {
  await requireAdmin();

  const input = createTurnSchema.parse({
    routeId: value(formData, "routeId"),
    direction: value(formData, "direction"),
    plannedDepartureAt: value(formData, "plannedDepartureAt") || undefined,
  });

  await createTripTurn({
    routeId: input.routeId,
    direction: input.direction,
    plannedDepartureAt: input.plannedDepartureAt
      ? new Date(input.plannedDepartureAt)
      : undefined,
  });

  revalidatePath("/trips");
  revalidatePath("/admin");
}

export async function joinDriverQueueAction(formData: FormData) {
  await requireAdmin();

  const input = joinDriverQueueSchema.parse({
    routeId: value(formData, "routeId"),
    direction: value(formData, "direction"),
    driverId: value(formData, "driverId"),
  });

  await joinDriverQueue(input);
  revalidatePath("/admin");
}

export async function enterOwnDriverQueueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = enterOwnDriverQueueSchema.parse({
    routeId: value(formData, "routeId"),
    direction: value(formData, "direction"),
  });

  await enterOwnDriverQueue({
    ...input,
    userId: user.id,
  });

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
}

export async function joinOwnDriverQueueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackURL=/driver");
  }

  const input = joinOwnDriverQueueSchema.parse({
    routeId: value(formData, "routeId"),
    direction: value(formData, "direction"),
  });

  await joinOwnDriverQueue({
    ...input,
    userId: user.id,
  });

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
}

export async function assignDriverToTripAction(formData: FormData) {
  await requireAdmin();

  const input = assignDriverToTripSchema.parse({
    tripId: value(formData, "tripId"),
    driverId: value(formData, "driverId"),
  });

  await assignDriverToTrip(input);
  revalidatePath("/admin");
  revalidatePath("/trips");
  revalidatePath(`/trip/${input.tripId}`);
}

export async function assignDriverToTripBoardAction(input: {
  tripId: string;
  driverId: string;
}) {
  await requireAdmin();

  const parsed = assignDriverToTripSchema.parse(input);

  await assignDriverToTrip(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/trips");
  revalidatePath(`/trip/${parsed.tripId}`);
}

export async function saveScheduleBoardAction(input: {
  assignments: Array<{ tripId: string; driverId: string }>;
  orders: Array<{ direction: string; tripIds: string[] }>;
}) {
  await requireAdmin();

  const parsed = saveScheduleBoardSchema.parse(input);

  await saveScheduleBoard(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/trips");
}

export async function saveRampQueuesAction(input: {
  routeId: string;
  queues: Array<{ direction: string; driverIds: string[] }>;
}) {
  await requireAdmin();

  const parsed = saveRampQueuesSchema.parse(input);

  await saveRampQueues(parsed);
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/trips");
}

export async function publishNextRampTurnAction(input: {
  routeId: string;
  direction: string;
}) {
  await requireAdmin();

  const parsed = publishNextRampTurnSchema.parse(input);
  const trip = await publishNextRampTurn(parsed);

  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/trips");
  revalidatePath(`/trip/${trip.id}`);
}

export async function upsertDriverProfileAction(formData: FormData) {
  await requireAdmin();

  const input = upsertDriverProfileSchema.parse({
    userId: value(formData, "userId"),
    phone: value(formData, "phone") || undefined,
    yapePhone: value(formData, "yapePhone"),
    yapeName: value(formData, "yapeName"),
    licensePlate: value(formData, "licensePlate"),
    vehicleName: value(formData, "vehicleName"),
  });

  await upsertDriverProfile(input);
  revalidatePath("/admin");
  revalidatePath("/driver");
  revalidatePath("/account");
}

export async function activateDriverProfileAction(formData: FormData) {
  await requireAdmin();

  const input = activateDriverProfileSchema.parse({
    userId: value(formData, "userId"),
  });

  await activateDriverProfile(input);
  revalidatePath("/admin");
  revalidatePath("/admin/conductores");
  revalidatePath("/account");
  revalidatePath("/driver");
  redirect("/admin/conductores?admin=driverEnabled");
}

export async function updateDriverActiveStateAction(formData: FormData) {
  await requireAdmin();

  const input = updateDriverActiveStateSchema.parse({
    driverId: value(formData, "driverId"),
    isActive: value(formData, "isActive"),
  });

  try {
    await updateDriverActiveState(input);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No se puede deshabilitar un conductor con turno activo"
    ) {
      redirect("/admin/conductores?admin=driverBusy");
    }

    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/conductores");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/trips");
  redirect(
    input.isActive
      ? "/admin/conductores?admin=driverReenabled"
      : "/admin/conductores?admin=driverDisabled",
  );
}

export async function suspendDriverAfterTripAction(formData: FormData) {
  await requireAdmin();

  const input = suspendDriverAfterTripSchema.parse({
    driverId: value(formData, "driverId"),
    reason: value(formData, "reason") || undefined,
  });

  await suspendDriverAfterCurrentTrip(input);
  revalidatePath("/admin");
  revalidatePath("/admin/conductores");
  revalidatePath("/driver");
  redirect("/admin/conductores?admin=driverSuspendAfterTrip");
}

export async function cancelDriverCurrentTripAction(formData: FormData) {
  await requireAdmin();

  const input = cancelDriverCurrentTripSchema.parse({
    driverId: value(formData, "driverId"),
    reason: value(formData, "reason") || undefined,
  });

  await cancelDriverCurrentTrip(input);
  revalidatePath("/admin");
  revalidatePath("/admin/conductores");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/trips");
  revalidatePath("/my-trips");
  redirect("/admin/conductores?admin=driverTripCancelled");
}

export async function reassignDriverCurrentTripAction(formData: FormData) {
  await requireAdmin();

  const input = reassignDriverCurrentTripSchema.parse({
    driverId: value(formData, "driverId"),
    replacementDriverId: value(formData, "replacementDriverId"),
    reason: value(formData, "reason") || undefined,
  });

  try {
    await reassignDriverCurrentTrip(input);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "El conductor de reemplazo ya tiene un turno activo" ||
        error.message === "El conductor de reemplazo debe tener Yape configurado" ||
        error.message === "El conductor de reemplazo no está activo")
    ) {
      redirect("/admin/conductores?admin=driverReassignBlocked");
    }

    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/conductores");
  revalidatePath("/admin/schedule");
  revalidatePath("/driver");
  revalidatePath("/trips");
  revalidatePath("/my-trips");
  redirect("/admin/conductores?admin=driverTripReassigned");
}
