import prisma from "@/lib/prisma";
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  QueueStatus,
  RouteDirection,
  TripStatus,
} from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

const activeTripStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
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

async function assignNextDriverIfReady(tx: Tx, tripId: string) {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: { route: true },
  });

  if (!trip) return;

  const canStart =
    trip.bookedSeats >= trip.route.minimumToStart || trip.adminOverride;
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

export async function listAvailableTrips() {
  return prisma.trip.findMany({
    where: { status: { in: activeTripStatuses } },
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

  return {
    trip,
    points: trip.route.points.filter((point) => point.direction === trip.direction),
  };
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
      include: { route: true },
    });

    if (!trip) throw new Error("Turno no encontrado");
    if (closedTripStatuses.includes(trip.status)) {
      throw new Error("Este turno ya no acepta reservas");
    }

    const boardingPoint = await tx.routePoint.findFirst({
      where: {
        id: input.boardingPointId,
        routeId: trip.routeId,
        direction: trip.direction,
      },
    });

    if (!boardingPoint) throw new Error("Punto de embarque inválido para este turno");

    const capacityUpdate = await tx.trip.updateMany({
      where: {
        id: trip.id,
        bookedSeats: { lt: trip.route.capacity },
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

    await assignNextDriverIfReady(tx, trip.id);

    return booking;
  });
}

export async function submitPaymentProof(input: {
  bookingId: string;
  proofUrl: string;
}) {
  return prisma.payment.update({
    where: { bookingId: input.bookingId },
    data: {
      proofUrl: input.proofUrl,
      status: PaymentStatus.SUBMITTED,
    },
  });
}

export async function approvePayment(paymentId: string, approvedById?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.APPROVED,
        approvedAt: new Date(),
        approvedById,
      },
    });

    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.PAID_PARTIAL },
    });

    return payment;
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

    return trip;
  });
}

export async function joinDriverQueue(input: {
  routeId: string;
  direction: RouteDirection;
  driverId: string;
}) {
  return prisma.$transaction(async (tx) => {
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
      },
    });
  });
}

export async function getAdminDashboard() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [trips, payments, queue, drivers] = await Promise.all([
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
      include: { booking: { include: { trip: true } } },
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
  ]);

  const todayTrips = trips.filter((trip) => trip.createdAt >= startOfDay);
  const revenueEstimate = trips.reduce(
    (sum, trip) =>
      sum +
      trip.bookings.filter((booking) => booking.status !== BookingStatus.CANCELLED).length *
        Number(trip.route.farePen),
    0,
  );
  const occupancy =
    trips.length === 0
      ? 0
      : trips.reduce((sum, trip) => sum + trip.bookedSeats / trip.route.capacity, 0) /
        trips.length;

  return {
    trips,
    payments,
    queue,
    drivers,
    metrics: {
      todayTrips: todayTrips.length,
      revenueEstimate,
      occupancy,
    },
  };
}
