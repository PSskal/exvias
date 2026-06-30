import prisma from "@/lib/prisma";
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  QueueStatus,
  RouteDirection,
  TripStatus,
  UserRole,
} from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

const activeTripStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
];

const driverOperationalTripStatuses: TripStatus[] = [
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
];

const driverVisibleTripStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  ...driverOperationalTripStatuses,
];

const driverUnavailableTripStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  ...driverOperationalTripStatuses,
];

const closedTripStatuses: TripStatus[] = [
  TripStatus.DEPARTED,
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
];

const driverAssignableStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
];

function nextTurnLabel(index: number) {
  if (index === 0) return "Turno actual";
  if (index === 1) return "Siguiente turno";
  return `Cola ${index + 1}`;
}

function nextDeparture(index: number) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + index * 25);
  return date;
}

function occupiedSeats(input: { bookedSeats: number; manualSeats: number }) {
  return input.bookedSeats + input.manualSeats;
}

async function reindexWaitingQueue(
  tx: Tx,
  input: {
    routeId: string;
    direction: RouteDirection;
  },
) {
  const entries = await tx.driverQueue.findMany({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      status: QueueStatus.WAITING,
    },
    orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
  });

  for (const [index, entry] of entries.entries()) {
    await tx.driverQueue.update({
      where: { id: entry.id },
      data: { position: 10_000 + index },
    });
  }

  for (const [index, entry] of entries.entries()) {
    await tx.driverQueue.update({
      where: { id: entry.id },
      data: { position: index + 1 },
    });
  }
}

async function clearDriverQueueState(
  tx: Tx,
  input: {
    driverId: string | null;
  },
) {
  if (!input.driverId) return;

  await tx.driverQueue.deleteMany({
    where: {
      driverId: input.driverId,
      status: { in: [QueueStatus.ASSIGNED, QueueStatus.WAITING] },
    },
  });
}

async function removeDriverFromWaitingQueues(tx: Tx, driverId: string) {
  const waitingEntries = await tx.driverQueue.findMany({
    where: {
      driverId,
      status: QueueStatus.WAITING,
    },
    select: {
      routeId: true,
      direction: true,
    },
  });

  await tx.driverQueue.deleteMany({
    where: {
      driverId,
      status: QueueStatus.WAITING,
    },
  });

  for (const entry of waitingEntries) {
    await reindexWaitingQueue(tx, {
      routeId: entry.routeId,
      direction: entry.direction,
    });
  }
}

async function applyPendingDriverSuspension(tx: Tx, driverId: string | null) {
  if (!driverId) return;

  const driver = await tx.driverProfile.findUnique({
    where: { id: driverId },
    select: { suspendAfterTrip: true },
  });

  if (!driver?.suspendAfterTrip) return;

  await removeDriverFromWaitingQueues(tx, driverId);

  await tx.driverProfile.update({
    where: { id: driverId },
    data: {
      isActive: false,
      suspendAfterTrip: false,
    },
  });
}

async function joinDriverQueueInTransaction(
  tx: Tx,
  input: {
    routeId: string;
    direction: RouteDirection;
    driverId: string;
  },
) {
  const driver = await tx.driverProfile.findUnique({
    where: { id: input.driverId },
  });

  if (!driver?.isActive) {
    throw new Error("Conductor no disponible");
  }

  const activeTrip = await tx.trip.findFirst({
    where: {
      driverId: input.driverId,
      status: { in: driverUnavailableTripStatuses },
    },
  });

  if (activeTrip) {
    throw new Error("Este conductor ya tiene un turno activo o publicado");
  }

  const existingWaitingEntry = await tx.driverQueue.findFirst({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: input.driverId,
      status: QueueStatus.WAITING,
    },
  });

  if (existingWaitingEntry) {
    return existingWaitingEntry;
  }

  await removeDriverFromWaitingQueues(tx, input.driverId);

  const lastEntry = await tx.driverQueue.findFirst({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      status: QueueStatus.WAITING,
    },
    orderBy: { position: "desc" },
  });

  return tx.driverQueue.create({
    data: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: input.driverId,
      position: (lastEntry?.position ?? 0) + 1,
      status: QueueStatus.WAITING,
    },
  });
}

async function publishDriverTurnInTransaction(
  tx: Tx,
  input: {
    routeId: string;
    direction: RouteDirection;
    driverId: string;
  },
) {
  const driver = await tx.driverProfile.findUnique({
    where: { id: input.driverId },
  });

  if (!driver?.isActive) {
    throw new Error("Conductor no disponible");
  }

  const route = await tx.route.findFirst({
    where: {
      id: input.routeId,
      isActive: true,
    },
  });

  if (!route) throw new Error("Ruta no disponible");

  const unavailableTrip = await tx.trip.findFirst({
    where: {
      driverId: input.driverId,
      status: { in: driverUnavailableTripStatuses },
    },
  });

  if (unavailableTrip) {
    throw new Error("Este conductor ya tiene un turno activo o publicado");
  }

  const waitingEntry = await tx.driverQueue.findFirst({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: input.driverId,
      status: QueueStatus.WAITING,
    },
  });

  if (!waitingEntry) {
    throw new Error("Primero entra a la rampa para publicar tu turno");
  }

  const firstWaitingEntry = await tx.driverQueue.findFirst({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      status: QueueStatus.WAITING,
    },
    orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
  });

  if (firstWaitingEntry?.id !== waitingEntry.id) {
    throw new Error("Aún tienes conductores delante en la rampa");
  }

  await tx.driverQueue.deleteMany({
    where: {
      driverId: input.driverId,
      status: { in: [QueueStatus.WAITING, QueueStatus.ASSIGNED] },
    },
  });

  const publishedCount = await tx.trip.count({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: { not: null },
      status: { in: activeTripStatuses },
    },
  });

  const trip = await tx.trip.create({
    data: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: input.driverId,
      turnLabel: nextTurnLabel(publishedCount),
      plannedDepartureAt: nextDeparture(publishedCount),
      status: publishedCount === 0 ? TripStatus.ACTIVE : TripStatus.QUEUED,
    },
  });

  await normalizePublishedTripsForDirection(tx, {
    routeId: input.routeId,
    direction: input.direction,
  });
  await reindexWaitingQueue(tx, {
    routeId: input.routeId,
    direction: input.direction,
  });

  return trip;
}

async function normalizePublishedTripsForDirection(
  tx: Tx,
  input: {
    routeId: string;
    direction: RouteDirection;
  },
) {
  const trips = await tx.trip.findMany({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      driverId: { not: null },
      status: { in: activeTripStatuses },
    },
    orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
  });

  for (const [index, trip] of trips.entries()) {
    const isCurrent = index === 0;
    const status = isCurrent
      ? trip.status === TripStatus.BOARDING
        ? TripStatus.BOARDING
        : TripStatus.ACTIVE
      : TripStatus.QUEUED;

    await tx.trip.update({
      where: { id: trip.id },
      data: {
        status,
        turnLabel: nextTurnLabel(index),
        activatedAt:
          isCurrent && trip.status === TripStatus.QUEUED
            ? new Date()
            : undefined,
      },
    });
  }
}

async function assignNextDriverIfReady(tx: Tx, tripId: string) {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: { route: true },
  });

  if (!trip) return;

  const canStart =
    occupiedSeats(trip) >= trip.route.minimumToStart || trip.adminOverride;
  if (
    !canStart ||
    !driverAssignableStatuses.includes(trip.status) ||
    trip.driverId
  ) {
    return;
  }

  const nextQueueEntry = await tx.driverQueue.findFirst({
    where: {
      routeId: trip.routeId,
      direction: trip.direction,
      status: QueueStatus.WAITING,
    },
    orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
  });

  if (nextQueueEntry) {
    await tx.driverQueue.update({
      where: { id: nextQueueEntry.id },
      data: { status: QueueStatus.ASSIGNED, assignedAt: new Date() },
    });
  }

  await tx.trip.update({
    where: { id: trip.id },
    data: {
      status: TripStatus.ACTIVE,
      activatedAt: new Date(),
      driverId: nextQueueEntry?.driverId,
    },
  });
}

export async function ensureTripTurns(routeId?: string, direction?: RouteDirection) {
  const route = routeId
    ? await prisma.route.findUniqueOrThrow({ where: { id: routeId } })
    : await prisma.route.findFirstOrThrow({ where: { isActive: true } });

  const directions = direction ? [direction] : Object.values(RouteDirection);

  for (const currentDirection of directions) {
    const existingTrips = await prisma.trip.findMany({
      where: {
        routeId: route.id,
        direction: currentDirection,
        status: { in: activeTripStatuses },
      },
      orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
    });

    for (let index = existingTrips.length; index < 3; index++) {
      await prisma.trip.create({
        data: {
          routeId: route.id,
          direction: currentDirection,
          turnLabel: nextTurnLabel(index),
          plannedDepartureAt: nextDeparture(index),
        },
      });
    }
  }
}

export async function normalizePublishedTrips(routeId?: string) {
  const routes = routeId
    ? [await prisma.route.findUniqueOrThrow({ where: { id: routeId } })]
    : await prisma.route.findMany({ where: { isActive: true } });

  await prisma.$transaction(async (tx) => {
    for (const route of routes) {
      for (const direction of Object.values(RouteDirection)) {
        await normalizePublishedTripsForDirection(tx, {
          routeId: route.id,
          direction,
        });
      }
    }
  });
}

export async function listAvailableTrips() {
  return prisma.trip.findMany({
    where: {
      status: { in: activeTripStatuses },
      driverId: { not: null },
    },
    include: {
      route: true,
      driver: { include: { user: true } },
      bookings: {
        where: { status: { not: BookingStatus.CANCELLED } },
        include: { boardingPoint: true, payment: true },
        orderBy: { seatNumber: "asc" },
      },
    },
    orderBy: [
      { direction: "asc" },
      { plannedDepartureAt: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function listBookingsForUser(userId?: string) {
  return prisma.booking.findMany({
    where: userId ? { userId } : undefined,
    include: {
      boardingPoint: true,
      payment: true,
      trip: {
        include: {
          route: true,
          driver: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getTripDetails(id: string) {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      route: true,
      driver: { include: { user: true } },
      bookings: {
        where: { status: { not: BookingStatus.CANCELLED } },
        include: { boardingPoint: true, payment: true },
        orderBy: { seatNumber: "asc" },
      },
    },
  });
}

export async function getTripBookingOptions(id: string) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id },
    include: {
      route: {
        include: {
          points: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  const directionPoints = trip.route.points.filter(
    (point) => point.direction === trip.direction,
  );

  return {
    trip,
    // Se muestran todos los puntos (la ruta completa hasta el destino),
    // pero el último (destino final) no es válido como punto de embarque.
    points: directionPoints,
    boardablePoints: directionPoints.slice(0, -1),
  };
}

export async function getPassengerProfile(userId?: string) {
  if (!userId) return null;

  return prisma.passengerProfile.findUnique({
    where: { userId },
  });
}

export async function getBookingDetails(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      boardingPoint: true,
      payment: true,
      trip: {
        include: {
          route: true,
          driver: { include: { user: true } },
        },
      },
    },
  });
}

export async function createTripTurn(input: {
  routeId: string;
  direction: RouteDirection;
  plannedDepartureAt?: Date;
}) {
  const tripCount = await prisma.trip.count({
    where: {
      routeId: input.routeId,
      direction: input.direction,
      status: { in: activeTripStatuses },
    },
  });

  return prisma.trip.create({
    data: {
      routeId: input.routeId,
      direction: input.direction,
      turnLabel: nextTurnLabel(tripCount),
      plannedDepartureAt: input.plannedDepartureAt ?? nextDeparture(tripCount),
    },
  });
}

async function assertBoardableRoutePoint(
  tx: Tx,
  boardingPoint: { id: string; routeId: string; direction: RouteDirection },
) {
  const lastPoint = await tx.routePoint.findFirst({
    where: { routeId: boardingPoint.routeId, direction: boardingPoint.direction },
    orderBy: { sequence: "desc" },
  });

  if (lastPoint && lastPoint.id === boardingPoint.id) {
    throw new Error("No puedes embarcar en el destino final de este turno");
  }
}

export async function reserveSeat(input: {
  tripId: string;
  boardingPointId: string;
  passengerName: string;
  passengerPhone: string;
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: input.tripId },
      include: { route: true, driver: true },
    });

    if (!trip) throw new Error("Turno no encontrado");
    if (closedTripStatuses.includes(trip.status)) {
      throw new Error("Este turno ya no acepta reservas");
    }
    if (!trip.driverId) {
      throw new Error("Este turno aún no tiene conductor asignado");
    }

    const boardingPoint = await tx.routePoint.findFirst({
      where: {
        id: input.boardingPointId,
        routeId: trip.routeId,
        direction: trip.direction,
      },
    });

    if (!boardingPoint) throw new Error("Punto de embarque inválido para este turno");
    await assertBoardableRoutePoint(tx, boardingPoint);

    const capacityUpdate = await tx.trip.updateMany({
      where: {
        id: trip.id,
        bookedSeats: { lt: trip.route.capacity - trip.manualSeats },
      },
      data: {
        bookedSeats: { increment: 1 },
      },
    });

    if (capacityUpdate.count !== 1) {
      throw new Error("El turno ya está lleno");
    }

    const takenSeats = await tx.booking.findMany({
      where: {
        tripId: trip.id,
        status: { not: BookingStatus.CANCELLED },
      },
      select: { seatNumber: true },
      orderBy: { seatNumber: "asc" },
    });
    const taken = new Set(takenSeats.map((seat) => seat.seatNumber));
    const seatNumber = Array.from({ length: trip.route.capacity }, (_, index) => index + 1).find(
      (seat) => !taken.has(seat),
    );

    if (!seatNumber) throw new Error("No hay asiento disponible");

    const booking = await tx.booking.create({
      data: {
        tripId: trip.id,
        userId: input.userId,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
        boardingPointId: input.boardingPointId,
        seatNumber,
        amountDuePen: trip.route.depositPen,
        payment: {
          create: {
            amountPen: trip.route.depositPen,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: { payment: true },
    });

    if (input.userId) {
      const profile = await tx.passengerProfile.findUnique({
        where: { userId: input.userId },
      });

      if (!profile) {
        await tx.passengerProfile.create({
          data: {
            userId: input.userId,
            phone: input.passengerPhone,
          },
        });
      } else if (!profile.phone) {
        await tx.passengerProfile.update({
          where: { userId: input.userId },
          data: { phone: input.passengerPhone },
        });
      }
    }

    await assignNextDriverIfReady(tx, trip.id);

    return booking;
  });
}

export async function reserveSeatWithPaymentProof(input: {
  tripId: string;
  boardingPointId: string;
  passengerName: string;
  passengerPhone: string;
  proofUrl: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: input.tripId },
      include: { route: true, driver: true },
    });

    if (!trip) throw new Error("Turno no encontrado");
    if (closedTripStatuses.includes(trip.status)) {
      throw new Error("Este turno ya no acepta reservas");
    }
    if (!trip.driverId) {
      throw new Error("Este turno aún no tiene conductor asignado");
    }
    if (!trip.driver?.yapePhone || !trip.driver.yapeName) {
      throw new Error("El conductor aún no tiene Yape configurado");
    }

    const boardingPoint = await tx.routePoint.findFirst({
      where: {
        id: input.boardingPointId,
        routeId: trip.routeId,
        direction: trip.direction,
      },
    });

    if (!boardingPoint) throw new Error("Punto de embarque inválido para este turno");
    await assertBoardableRoutePoint(tx, boardingPoint);

    const capacityUpdate = await tx.trip.updateMany({
      where: {
        id: trip.id,
        bookedSeats: { lt: trip.route.capacity - trip.manualSeats },
      },
      data: {
        bookedSeats: { increment: 1 },
      },
    });

    if (capacityUpdate.count !== 1) {
      throw new Error("El turno ya está lleno");
    }

    const takenSeats = await tx.booking.findMany({
      where: {
        tripId: trip.id,
        status: { not: BookingStatus.CANCELLED },
      },
      select: { seatNumber: true },
      orderBy: { seatNumber: "asc" },
    });
    const taken = new Set(takenSeats.map((seat) => seat.seatNumber));
    const seatNumber = Array.from(
      { length: trip.route.capacity },
      (_, index) => index + 1,
    ).find((seat) => !taken.has(seat));

    if (!seatNumber) throw new Error("No hay asiento disponible");

    const booking = await tx.booking.create({
      data: {
        tripId: trip.id,
        userId: input.userId,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
        boardingPointId: input.boardingPointId,
        seatNumber,
        amountDuePen: trip.route.depositPen,
        status: BookingStatus.RESERVED,
        payment: {
          create: {
            amountPen: trip.route.depositPen,
            proofUrl: input.proofUrl,
            status: PaymentStatus.SUBMITTED,
          },
        },
      },
      include: { payment: true },
    });

    const profile = await tx.passengerProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!profile) {
      await tx.passengerProfile.create({
        data: {
          userId: input.userId,
          phone: input.passengerPhone,
        },
      });
    } else if (!profile.phone) {
      await tx.passengerProfile.update({
        where: { userId: input.userId },
        data: { phone: input.passengerPhone },
      });
    }

    return booking;
  });
}

export async function submitPaymentProof(input: {
  bookingId: string;
  proofUrl: string;
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        trip: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!booking?.trip.driver) {
      throw new Error("Este turno no tiene conductor asignado para recibir Yape");
    }
    if (!booking.trip.driver.yapePhone || !booking.trip.driver.yapeName) {
      throw new Error("El conductor aún no tiene Yape configurado");
    }

    return tx.payment.update({
      where: { bookingId: input.bookingId },
      data: {
        proofUrl: input.proofUrl,
        status: PaymentStatus.SUBMITTED,
      },
    });
  });
}

export async function approvePayment(paymentId: string, approvedById?: string) {
  return prisma.$transaction(async (tx) => {
    const actor = approvedById
      ? await tx.user.findUnique({
          where: { id: approvedById },
          include: { driverProfile: true },
        })
      : null;
    const currentPayment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!currentPayment) throw new Error("Pago no encontrado");
    if (!currentPayment.proofUrl) {
      throw new Error("No se puede aprobar un pago sin comprobante");
    }

    const driverProfileId = actor?.driverProfile?.id;
    const isAssignedDriver =
      Boolean(driverProfileId) &&
      currentPayment.booking.trip.driverId === driverProfileId;
    const isAdmin = actor?.role === "ADMIN";

    if (approvedById && !isAdmin && !isAssignedDriver) {
      throw new Error("Solo el conductor asignado o admin puede confirmar este pago");
    }

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
        approvedById,
        confirmedByDriverId: isAssignedDriver ? driverProfileId : undefined,
        confirmedByDriverAt: isAssignedDriver ? new Date() : undefined,
      },
    });

    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.PAID_PARTIAL },
    });

    return payment;
  });
}

export async function rejectPayment(input: {
  paymentId: string;
  rejectedById?: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const actor = input.rejectedById
      ? await tx.user.findUnique({
          where: { id: input.rejectedById },
          include: { driverProfile: true },
        })
      : null;
    const currentPayment = await tx.payment.findUnique({
      where: { id: input.paymentId },
      include: {
        booking: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!currentPayment) throw new Error("Pago no encontrado");
    if (currentPayment.status !== PaymentStatus.SUBMITTED) {
      throw new Error("Solo se puede rechazar un Yape en revisión");
    }

    const driverProfileId = actor?.driverProfile?.id;
    const isAssignedDriver =
      Boolean(driverProfileId) &&
      currentPayment.booking.trip.driverId === driverProfileId;
    const isAdmin = actor?.role === "ADMIN";

    if (input.rejectedById && !isAdmin && !isAssignedDriver) {
      throw new Error("Solo el conductor asignado o admin puede rechazar este pago");
    }

    await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        rejectedReason: input.reason || "Comprobante no válido",
      },
    });

    await tx.booking.update({
      where: { id: currentPayment.bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    await tx.trip.updateMany({
      where: {
        id: currentPayment.booking.tripId,
        bookedSeats: { gt: 0 },
      },
      data: {
        bookedSeats: { decrement: 1 },
      },
    });

    return currentPayment;
  });
}

export async function getDriverDashboard(userId?: string) {
  if (!userId) return null;

  const driver = await prisma.driverProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!driver) return null;

  const [trips, lastClosedTrip] = await Promise.all([
    prisma.trip.findMany({
      where: {
        driverId: driver.id,
        status: { in: driverVisibleTripStatuses },
      },
      include: {
        route: true,
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          include: {
            boardingPoint: true,
            payment: true,
          },
          orderBy: { seatNumber: "asc" },
        },
      },
      orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: closedTripStatuses },
      },
      orderBy: [{ completedAt: "desc" }, { departedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const [queueEntries, routes] = await Promise.all([
    prisma.driverQueue.findMany({
      where: {
        driverId: driver.id,
        status: QueueStatus.WAITING,
      },
      include: { route: true },
      orderBy: [{ joinedAt: "desc" }],
    }),
    prisma.route.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { driver, trips, queueEntries, routes, lastClosedTrip };
}

export async function updateDriverTripStatus(input: {
  tripId: string;
  status: TripStatus;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driverProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!driver) throw new Error("Perfil de conductor no encontrado");

    const trip = await tx.trip.findUnique({
      where: { id: input.tripId },
      include: { route: true },
    });

    if (!trip || trip.driverId !== driver.id) {
      throw new Error("No puedes operar un turno que no está asignado a ti");
    }

    if (input.status === TripStatus.DEPARTED) {
      const canDepart =
        occupiedSeats(trip) >= trip.route.minimumToStart || trip.adminOverride;
      if (!canDepart) {
        throw new Error("No puedes salir con menos de 4 pasajeros confirmados");
      }
    }

    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: input.status,
        departedAt: input.status === TripStatus.DEPARTED ? new Date() : undefined,
        completedAt: input.status === TripStatus.COMPLETED ? new Date() : undefined,
      },
    });

    if (
      updatedTrip.status === TripStatus.DEPARTED ||
      updatedTrip.status === TripStatus.COMPLETED
    ) {
      await normalizePublishedTripsForDirection(tx, {
        routeId: updatedTrip.routeId,
        direction: updatedTrip.direction,
      });
    }

    if (updatedTrip.status === TripStatus.COMPLETED) {
      await clearDriverQueueState(tx, {
        driverId: updatedTrip.driverId,
      });
      await applyPendingDriverSuspension(tx, updatedTrip.driverId);
    }

    return updatedTrip;
  });
}

export async function updateDriverBookingStatus(input: {
  bookingId: string;
  status: BookingStatus;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driverProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!driver) throw new Error("Perfil de conductor no encontrado");

    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        payment: true,
        trip: true,
      },
    });

    if (!booking || booking.trip.driverId !== driver.id) {
      throw new Error("No puedes actualizar un pasajero de otro turno");
    }

    if (
      input.status === BookingStatus.BOARDED &&
      booking.payment?.status !== PaymentStatus.APPROVED
    ) {
      throw new Error("Confirma primero el Yape del pasajero");
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: { status: input.status },
    });
  });
}

export async function updateDriverVehicle(input: {
  userId: string;
  vehicleName: string;
}) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (!driver) throw new Error("Perfil de conductor no encontrado");

  return prisma.driverProfile.update({
    where: { id: driver.id },
    data: { vehicleName: input.vehicleName },
  });
}

export async function updateOwnDriverSettings(input: {
  userId: string;
  phone?: string;
  yapePhone: string;
  yapeName: string;
  licensePlate: string;
  vehicleName: string;
}) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (!driver) throw new Error("Perfil de conductor no encontrado");

  return prisma.driverProfile.update({
    where: { id: driver.id },
    data: {
      phone: input.phone || null,
      yapePhone: input.yapePhone,
      yapeName: input.yapeName,
      licensePlate: input.licensePlate,
      vehicleName: input.vehicleName,
    },
  });
}

export async function updateManualSeats(input: {
  tripId: string;
  delta: number;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driverProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!driver) throw new Error("Perfil de conductor no encontrado");

    const trip = await tx.trip.findUnique({
      where: { id: input.tripId },
      include: { route: true },
    });

    if (!trip || trip.driverId !== driver.id) {
      throw new Error("No puedes actualizar pasajeros de otro turno");
    }
    if (
      trip.status !== TripStatus.ACTIVE &&
      trip.status !== TripStatus.BOARDING
    ) {
      throw new Error("Solo puedes ajustar pasajeros antes de salir");
    }

    const nextManualSeats = trip.manualSeats + input.delta;
    if (nextManualSeats < 0) {
      throw new Error("No puedes tener menos de 0 pasajeros en terminal");
    }
    if (trip.bookedSeats + nextManualSeats > trip.route.capacity) {
      throw new Error("No hay asientos disponibles para agregar otro pasajero");
    }

    return tx.trip.update({
      where: { id: trip.id },
      data: { manualSeats: nextManualSeats },
    });
  });
}

export async function updateTripStatus(input: {
  tripId: string;
  status: TripStatus;
  adminOverride?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.update({
      where: { id: input.tripId },
      data: {
        status: input.status,
        adminOverride: input.adminOverride ?? undefined,
        departedAt: input.status === TripStatus.DEPARTED ? new Date() : undefined,
        completedAt: input.status === TripStatus.COMPLETED ? new Date() : undefined,
      },
      include: { route: true },
    });

    if (trip.status === TripStatus.ACTIVE) {
      await assignNextDriverIfReady(tx, trip.id);
    }

    if (
      trip.status === TripStatus.DEPARTED ||
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      await normalizePublishedTripsForDirection(tx, {
        routeId: trip.routeId,
        direction: trip.direction,
      });
    }

    if (trip.status === TripStatus.COMPLETED) {
      await clearDriverQueueState(tx, {
        driverId: trip.driverId,
      });
      await applyPendingDriverSuspension(tx, trip.driverId);
    }

    return trip;
  });
}

export async function joinDriverQueue(input: {
  routeId: string;
  direction: RouteDirection;
  driverId: string;
}) {
  return prisma.$transaction((tx) => joinDriverQueueInTransaction(tx, input));
}

export async function enterOwnDriverQueue(input: {
  routeId: string;
  direction: RouteDirection;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driverProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!driver) throw new Error("Perfil de conductor no encontrado");

    const route = await tx.route.findFirst({
      where: {
        id: input.routeId,
        isActive: true,
      },
    });

    if (!route) throw new Error("Ruta no disponible");

    return joinDriverQueueInTransaction(tx, {
      routeId: input.routeId,
      direction: input.direction,
      driverId: driver.id,
    });
  });
}

export async function joinOwnDriverQueue(input: {
  routeId: string;
  direction: RouteDirection;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driverProfile.findUnique({
      where: { userId: input.userId },
    });

    if (!driver) throw new Error("Perfil de conductor no encontrado");

    const route = await tx.route.findFirst({
      where: {
        id: input.routeId,
        isActive: true,
      },
    });

    if (!route) throw new Error("Ruta no disponible");

    return publishDriverTurnInTransaction(tx, {
      routeId: input.routeId,
      direction: input.direction,
      driverId: driver.id,
    });
  });
}

export async function saveRampQueues(input: {
  routeId: string;
  queues: Array<{ direction: RouteDirection; driverIds: string[] }>;
}) {
  return prisma.$transaction(async (tx) => {
    const driverIds = input.queues.flatMap((queue) => queue.driverIds);

    if (new Set(driverIds).size !== driverIds.length) {
      throw new Error("Un conductor no puede estar en dos rampas a la vez");
    }

    const [route, drivers, unavailableTrips] =
      await Promise.all([
        tx.route.findUnique({ where: { id: input.routeId } }),
        tx.driverProfile.findMany({
          where: { id: { in: driverIds } },
          select: { id: true, isActive: true },
        }),
        tx.trip.findMany({
          where: {
            driverId: { in: driverIds },
            status: { in: driverUnavailableTripStatuses },
          },
          select: { driverId: true },
        }),
      ]);

    if (!route) throw new Error("Ruta no encontrada");

    const activeDriverIds = new Set(
      drivers.filter((driver) => driver.isActive).map((driver) => driver.id),
    );
    const unavailableDriverIds = new Set(
      unavailableTrips.map((trip) => trip.driverId).filter(Boolean),
    );

    for (const driverId of driverIds) {
      if (!activeDriverIds.has(driverId)) {
        throw new Error("Uno de los conductores no está activo");
      }
      if (unavailableDriverIds.has(driverId)) {
        throw new Error("Uno de los conductores ya tiene un turno publicado");
      }
    }

    await tx.driverQueue.deleteMany({
      where: {
        routeId: input.routeId,
        status: QueueStatus.WAITING,
      },
    });

    for (const queue of input.queues) {
      for (const [index, driverId] of queue.driverIds.entries()) {
        await tx.driverQueue.create({
          data: {
            routeId: input.routeId,
            direction: queue.direction,
            driverId,
            position: index + 1,
            status: QueueStatus.WAITING,
          },
        });
      }
    }
  });
}

export async function publishNextRampTurn(input: {
  routeId: string;
  direction: RouteDirection;
}) {
  return prisma.$transaction(async (tx) => {
    const route = await tx.route.findUnique({
      where: { id: input.routeId },
    });

    if (!route) throw new Error("Ruta no encontrada");

    const nextQueueEntry = await tx.driverQueue.findFirst({
      where: {
        routeId: input.routeId,
        direction: input.direction,
        status: QueueStatus.WAITING,
      },
      orderBy: [{ position: "asc" }, { joinedAt: "asc" }],
    });

    if (!nextQueueEntry) {
      throw new Error("No hay conductores en rampa para publicar");
    }

    const unavailableTrip = await tx.trip.findFirst({
      where: {
        driverId: nextQueueEntry.driverId,
        status: { in: driverUnavailableTripStatuses },
      },
    });

    if (unavailableTrip) {
      throw new Error("El primer conductor ya tiene un turno publicado");
    }

    const publishedCount = await tx.trip.count({
      where: {
        routeId: input.routeId,
        direction: input.direction,
        driverId: { not: null },
        status: { in: activeTripStatuses },
      },
    });

    const trip = await tx.trip.create({
      data: {
        routeId: input.routeId,
        direction: input.direction,
        driverId: nextQueueEntry.driverId,
        turnLabel: nextTurnLabel(publishedCount),
        plannedDepartureAt: nextDeparture(publishedCount),
        status: publishedCount === 0 ? TripStatus.ACTIVE : TripStatus.QUEUED,
      },
    });

    await tx.driverQueue.update({
      where: { id: nextQueueEntry.id },
      data: {
        status: QueueStatus.ASSIGNED,
        assignedAt: new Date(),
      },
    });

    await reindexWaitingQueue(tx, {
      routeId: input.routeId,
      direction: input.direction,
    });

    await normalizePublishedTripsForDirection(tx, {
      routeId: input.routeId,
      direction: input.direction,
    });

    return trip;
  });
}

export async function assignDriverToTrip(input: {
  tripId: string;
  driverId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const [trip, driver] = await Promise.all([
      tx.trip.findUnique({ where: { id: input.tripId } }),
      tx.driverProfile.findUnique({ where: { id: input.driverId } }),
    ]);

    if (!trip) throw new Error("Turno no encontrado");
    if (!driver?.isActive) throw new Error("Conductor no disponible");
    if (closedTripStatuses.includes(trip.status)) {
      throw new Error("No se puede asignar conductor a un turno cerrado");
    }

    const conflictingTrip = await tx.trip.findFirst({
      where: {
        id: { not: trip.id },
        driverId: driver.id,
        status: { in: [TripStatus.QUEUED, TripStatus.ACTIVE, TripStatus.BOARDING, TripStatus.DEPARTED] },
      },
    });

    if (conflictingTrip) {
      throw new Error("Este conductor ya tiene un turno activo asignado");
    }

    return tx.trip.update({
      where: { id: trip.id },
      data: { driverId: driver.id },
    });
  });
}

export async function saveScheduleBoard(input: {
  assignments: Array<{ tripId: string; driverId: string }>;
  orders: Array<{ direction: RouteDirection; tripIds: string[] }>;
}) {
  return prisma.$transaction(async (tx) => {
    const assignmentTripIds = input.assignments.map((item) => item.tripId);
    const assignmentDriverIds = input.assignments.map((item) => item.driverId);

    if (new Set(assignmentDriverIds).size !== assignmentDriverIds.length) {
      throw new Error("Un conductor no puede estar en dos turnos activos");
    }

    const [assignmentTrips, assignmentDrivers] = await Promise.all([
      tx.trip.findMany({ where: { id: { in: assignmentTripIds } } }),
      tx.driverProfile.findMany({ where: { id: { in: assignmentDriverIds } } }),
    ]);

    const tripById = new Map(assignmentTrips.map((trip) => [trip.id, trip]));
    const activeDriverIds = new Set(
      assignmentDrivers.filter((driver) => driver.isActive).map((driver) => driver.id),
    );

    for (const assignment of input.assignments) {
      const trip = tripById.get(assignment.tripId);
      if (!trip) throw new Error("Turno no encontrado");
      if (!activeDriverIds.has(assignment.driverId)) {
        throw new Error("Conductor no disponible");
      }
      if (closedTripStatuses.includes(trip.status)) {
        throw new Error("No se puede asignar conductor a un turno cerrado");
      }
    }

    const existingConflicts = await tx.trip.findMany({
      where: {
        id: { notIn: assignmentTripIds },
        driverId: { in: assignmentDriverIds },
        status: {
          in: [
            TripStatus.QUEUED,
            TripStatus.ACTIVE,
            TripStatus.BOARDING,
            TripStatus.DEPARTED,
          ],
        },
      },
    });

    if (existingConflicts.length > 0) {
      throw new Error("Uno de los conductores ya tiene un turno activo");
    }

    for (const assignment of input.assignments) {
      await tx.trip.update({
        where: { id: assignment.tripId },
        data: { driverId: assignment.driverId },
      });
    }

    for (const order of input.orders) {
      const trips = await tx.trip.findMany({
        where: {
          id: { in: order.tripIds },
          direction: order.direction,
          status: { in: activeTripStatuses },
        },
        orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
      });
      const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
      const orderedIds = order.tripIds.filter((tripId) => tripMap.has(tripId));
      const timeSlots = trips.map(
        (trip, index) => trip.plannedDepartureAt ?? nextDeparture(index),
      );

      for (const [index, tripId] of orderedIds.entries()) {
        const currentTrip = tripMap.get(tripId);
        const status =
          currentTrip?.status === TripStatus.BOARDING
            ? TripStatus.BOARDING
            : index === 0
              ? TripStatus.ACTIVE
              : TripStatus.QUEUED;

        await tx.trip.update({
          where: { id: tripId },
          data: {
            plannedDepartureAt: timeSlots[index] ?? nextDeparture(index),
            turnLabel: nextTurnLabel(index),
            status,
          },
        });
      }
    }
  });
}

export async function upsertDriverProfile(input: {
  userId: string;
  phone?: string;
  yapePhone: string;
  yapeName: string;
  licensePlate: string;
  vehicleName: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { role: UserRole.DRIVER },
    });

    return tx.driverProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        phone: input.phone || null,
        yapePhone: input.yapePhone,
        yapeName: input.yapeName,
        licensePlate: input.licensePlate,
        vehicleName: input.vehicleName,
      },
      update: {
        phone: input.phone || null,
        yapePhone: input.yapePhone,
        yapeName: input.yapeName,
        licensePlate: input.licensePlate,
        vehicleName: input.vehicleName,
        isActive: true,
      },
    });
  });
}

export async function activateDriverProfile(input: { userId: string }) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { role: UserRole.DRIVER },
    });

    return tx.driverProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  });
}

export async function updateDriverActiveState(input: {
  driverId: string;
  isActive: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    if (!input.isActive) {
      const activeTrip = await tx.trip.findFirst({
        where: {
          driverId: input.driverId,
          status: { in: driverUnavailableTripStatuses },
        },
      });

      if (activeTrip) {
        throw new Error("No se puede deshabilitar un conductor con turno activo");
      }

      await removeDriverFromWaitingQueues(tx, input.driverId);
    }

    return tx.driverProfile.update({
      where: { id: input.driverId },
      data: {
        isActive: input.isActive,
        suspendAfterTrip: input.isActive ? false : undefined,
        suspensionReason: input.isActive ? null : undefined,
      },
    });
  });
}

export async function suspendDriverAfterCurrentTrip(input: {
  driverId: string;
  reason?: string;
}) {
  return prisma.driverProfile.update({
    where: { id: input.driverId },
    data: {
      suspendAfterTrip: true,
      suspensionReason: input.reason || "Suspensión administrativa al finalizar turno",
    },
  });
}

export async function cancelDriverCurrentTrip(input: {
  driverId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({
      where: {
        driverId: input.driverId,
        status: { in: driverUnavailableTripStatuses },
      },
      include: {
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          include: { payment: true },
        },
      },
      orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
    });

    if (!trip) {
      await removeDriverFromWaitingQueues(tx, input.driverId);
      return tx.driverProfile.update({
        where: { id: input.driverId },
        data: {
          isActive: false,
          suspendAfterTrip: false,
          suspensionReason: input.reason || "Retirado por administración",
        },
      });
    }

    await tx.booking.updateMany({
      where: {
        tripId: trip.id,
        status: { not: BookingStatus.CANCELLED },
      },
      data: { status: BookingStatus.CANCELLED },
    });

    await tx.payment.updateMany({
      where: {
        booking: { tripId: trip.id },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.SUBMITTED] },
      },
      data: {
        status: PaymentStatus.REJECTED,
        rejectedReason:
          input.reason || "Viaje cancelado por administración",
      },
    });

    await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: TripStatus.CANCELLED,
        bookedSeats: 0,
        completedAt: new Date(),
      },
    });

    await clearDriverQueueState(tx, { driverId: input.driverId });
    await tx.driverProfile.update({
      where: { id: input.driverId },
      data: {
        isActive: false,
        suspendAfterTrip: false,
        suspensionReason: input.reason || "Retirado por administración",
      },
    });

    await normalizePublishedTripsForDirection(tx, {
      routeId: trip.routeId,
      direction: trip.direction,
    });

    return trip;
  });
}

export async function reassignDriverCurrentTrip(input: {
  driverId: string;
  replacementDriverId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.driverId === input.replacementDriverId) {
      throw new Error("Selecciona un conductor diferente para reasignar");
    }

    const [trip, replacementDriver] = await Promise.all([
      tx.trip.findFirst({
        where: {
          driverId: input.driverId,
          status: { in: driverUnavailableTripStatuses },
        },
        include: {
          bookings: {
            where: { status: { not: BookingStatus.CANCELLED } },
          },
        },
        orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
      }),
      tx.driverProfile.findUnique({
        where: { id: input.replacementDriverId },
      }),
    ]);

    if (!trip) throw new Error("El conductor no tiene turno para reasignar");
    if (!replacementDriver?.isActive) {
      throw new Error("El conductor de reemplazo no está activo");
    }
    if (!replacementDriver.yapePhone || !replacementDriver.yapeName) {
      throw new Error("El conductor de reemplazo debe tener Yape configurado");
    }

    const replacementConflict = await tx.trip.findFirst({
      where: {
        driverId: input.replacementDriverId,
        status: { in: driverUnavailableTripStatuses },
      },
    });

    if (replacementConflict) {
      throw new Error("El conductor de reemplazo ya tiene un turno activo");
    }

    await removeDriverFromWaitingQueues(tx, input.replacementDriverId);

    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: { driverId: input.replacementDriverId },
    });

    await clearDriverQueueState(tx, { driverId: input.driverId });
    await tx.driverProfile.update({
      where: { id: input.driverId },
      data: {
        isActive: false,
        suspendAfterTrip: false,
        suspensionReason: input.reason || "Retirado y reemplazado por administración",
      },
    });

    return updatedTrip;
  });
}

export async function getAdminDashboard() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [trips, payments, queue, drivers, users, routes] = await Promise.all([
    prisma.trip.findMany({
      include: {
        route: true,
        driver: { include: { user: true } },
        bookings: { include: { boardingPoint: true, payment: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: { status: { in: [PaymentStatus.SUBMITTED, PaymentStatus.PENDING] } },
      include: {
        booking: {
          include: {
            trip: { include: { driver: { include: { user: true } } } },
            boardingPoint: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driverQueue.findMany({
      include: { driver: { include: { user: true } }, route: true },
      orderBy: [{ direction: "asc" }, { status: "asc" }, { position: "asc" }],
    }),
    prisma.driverProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      include: { driverProfile: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.route.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const todayTrips = trips.filter((trip) => trip.createdAt >= startOfDay);
  const revenueEstimate = trips.reduce(
    (sum, trip) =>
      sum +
      (trip.bookings.filter((booking) => booking.status !== BookingStatus.CANCELLED).length +
        trip.manualSeats) *
        Number(trip.route.farePen),
    0,
  );
  const occupancy =
    trips.length === 0
      ? 0
      : trips.reduce(
          (sum, trip) => sum + occupiedSeats(trip) / trip.route.capacity,
          0,
        ) /
        trips.length;

  return {
    trips,
    payments,
    queue,
    drivers,
    users,
    routes,
    metrics: {
      todayTrips: todayTrips.length,
      revenueEstimate,
      occupancy,
    },
  };
}
