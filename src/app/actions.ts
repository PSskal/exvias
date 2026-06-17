"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approvePayment,
  createTripTurn,
  joinDriverQueue,
  reserveSeat,
  submitPaymentProof,
  updateTripStatus,
} from "@/lib/exvias/trips";
import {
  approvePaymentSchema,
  bookingSchema,
  createTurnSchema,
  joinDriverQueueSchema,
  paymentProofSchema,
  updateTripStatusSchema,
} from "@/lib/exvias/validation";
import { getCurrentUser } from "@/lib/session";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
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

  const booking = await reserveSeat({
    ...input,
    userId: user.id,
  });

  revalidatePath("/trips");
  revalidatePath(`/trip/${input.tripId}`);
  redirect(`/payment?bookingId=${booking.id}`);
}

export async function submitPaymentProofAction(formData: FormData) {
  const uploadedFile = formData.get("proofFile");
  const fileName =
    uploadedFile instanceof File && uploadedFile.size > 0
      ? uploadedFile.name
      : value(formData, "proofUrl");

  const input = paymentProofSchema.parse({
    bookingId: value(formData, "bookingId"),
    proofUrl: fileName,
  });

  await submitPaymentProof(input);

  revalidatePath("/payment");
  revalidatePath("/admin");
  redirect(`/tracking/${input.bookingId}`);
}

export async function approvePaymentAction(formData: FormData) {
  const input = approvePaymentSchema.parse({
    paymentId: value(formData, "paymentId"),
  });

  await approvePayment(input.paymentId);
  revalidatePath("/admin");
}

export async function updateTripStatusAction(formData: FormData) {
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

export async function createTripTurnAction(formData: FormData) {
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
  const input = joinDriverQueueSchema.parse({
    routeId: value(formData, "routeId"),
    direction: value(formData, "direction"),
    driverId: value(formData, "driverId"),
  });

  await joinDriverQueue(input);
  revalidatePath("/admin");
}
