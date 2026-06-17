import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  BookingStatus,
  PaymentStatus,
  QueueStatus,
  RouteDirection,
  TripStatus,
  UserRole,
} from "../src/lib/generated/prisma/client";
import { defaultRoutePoints, EXVIASS } from "../src/lib/exvias/constants";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const route = await prisma.route.upsert({
    where: {
      origin_destination: {
        origin: "Cusco",
        destination: "Colquepata",
      },
    },
    update: {
      name: "Cusco - Colquepata",
      farePen: EXVIASS.farePen,
      depositPen: EXVIASS.depositPen,
      capacity: EXVIASS.vehicleCapacity,
      minimumToStart: EXVIASS.minimumDeparture,
      isActive: true,
    },
    create: {
      name: "Cusco - Colquepata",
      origin: "Cusco",
      destination: "Colquepata",
      farePen: EXVIASS.farePen,
      depositPen: EXVIASS.depositPen,
      capacity: EXVIASS.vehicleCapacity,
      minimumToStart: EXVIASS.minimumDeparture,
    },
  });

  for (const direction of Object.values(RouteDirection)) {
    for (const [index, point] of defaultRoutePoints[direction].entries()) {
      await prisma.routePoint.upsert({
        where: {
          routeId_direction_sequence: {
            routeId: route.id,
            direction,
            sequence: index + 1,
          },
        },
        update: {
          name: point.name,
          minuteOffset: point.minuteOffset,
          isTerminal: point.isTerminal ?? false,
        },
        create: {
          routeId: route.id,
          direction,
          sequence: index + 1,
          name: point.name,
          minuteOffset: point.minuteOffset,
          isTerminal: point.isTerminal ?? false,
        },
      });
    }
  }

  const driverUser = await prisma.user.upsert({
    where: { email: "juan.carlos@exviass.test" },
    update: { name: "Juan Carlos", role: UserRole.DRIVER },
    create: {
      id: "seed-driver-juan-carlos",
      name: "Juan Carlos",
      email: "juan.carlos@exviass.test",
      emailVerified: true,
      role: UserRole.DRIVER,
    },
  });

  const driver = await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {
      phone: "987654321",
      licensePlate: "EXV-01",
      vehicleName: "Hyundai H1",
      capacity: EXVIASS.vehicleCapacity,
      isActive: true,
    },
    create: {
      userId: driverUser.id,
      phone: "987654321",
      licensePlate: "EXV-01",
      vehicleName: "Hyundai H1",
      capacity: EXVIASS.vehicleCapacity,
    },
  });

  const now = new Date();
  const turnStarts: Record<RouteDirection, Date[]> = {
    CUSCO_TO_COLQUEPATA: [addMinutes(now, 10), addMinutes(now, 40), addMinutes(now, 80)],
    COLQUEPATA_TO_CUSCO: [addMinutes(now, 25), addMinutes(now, 65), addMinutes(now, 105)],
  };

  for (const direction of Object.values(RouteDirection)) {
    const existingTrips = await prisma.trip.findMany({
      where: {
        routeId: route.id,
        direction,
        status: { in: [TripStatus.QUEUED, TripStatus.ACTIVE, TripStatus.BOARDING] },
      },
      orderBy: { plannedDepartureAt: "asc" },
    });

    for (let index = existingTrips.length; index < 3; index++) {
      await prisma.trip.create({
        data: {
          routeId: route.id,
          direction,
          turnLabel:
            index === 0
              ? "Turno actual"
              : index === 1
                ? "Siguiente turno"
                : `Turno ${index + 1}`,
          plannedDepartureAt: turnStarts[direction][index],
          status: index === 0 ? TripStatus.ACTIVE : TripStatus.QUEUED,
          driverId: index === 0 ? driver.id : undefined,
        },
      });
    }

    const waitingEntry = await prisma.driverQueue.findFirst({
      where: {
        routeId: route.id,
        direction,
        driverId: driver.id,
        status: QueueStatus.WAITING,
      },
    });

    if (!waitingEntry) {
      await prisma.driverQueue.create({
        data: {
          routeId: route.id,
          direction,
          driverId: driver.id,
          position: 1,
          status: QueueStatus.WAITING,
        },
      });
    }
  }

  const firstTrip = await prisma.trip.findFirst({
    where: {
      routeId: route.id,
      direction: RouteDirection.CUSCO_TO_COLQUEPATA,
      status: { in: [TripStatus.QUEUED, TripStatus.ACTIVE, TripStatus.BOARDING] },
    },
    orderBy: { plannedDepartureAt: "asc" },
  });

  if (firstTrip) {
    await prisma.trip.update({
      where: { id: firstTrip.id },
      data: {
        status: TripStatus.ACTIVE,
        driverId: driver.id,
      },
    });

    const boardingPoint = await prisma.routePoint.findFirstOrThrow({
      where: {
        routeId: route.id,
        direction: RouteDirection.CUSCO_TO_COLQUEPATA,
        name: "Wanchaq",
      },
    });
    const existingBookings = await prisma.booking.count({
      where: { tripId: firstTrip.id },
    });

    for (let index = existingBookings; index < 3; index++) {
      await prisma.booking.create({
        data: {
          tripId: firstTrip.id,
          passengerName: `Pasajero Demo ${index + 1}`,
          passengerPhone: `90000000${index + 1}`,
          seatNumber: index + 1,
          boardingPointId: boardingPoint.id,
          status: index === 0 ? BookingStatus.PAID_PARTIAL : BookingStatus.RESERVED,
          amountDuePen: EXVIASS.depositPen,
          payment: {
            create: {
              amountPen: EXVIASS.depositPen,
              status: index === 0 ? PaymentStatus.APPROVED : PaymentStatus.PENDING,
              proofUrl: index === 0 ? "seed-demo" : undefined,
            },
          },
        },
      });
    }

    await prisma.trip.update({
      where: { id: firstTrip.id },
      data: {
        bookedSeats: await prisma.booking.count({
          where: { tripId: firstTrip.id, status: { not: BookingStatus.CANCELLED } },
        }),
      },
    });
  }

  console.log("Seed EXVIASS completado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
