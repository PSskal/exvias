import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  RouteDirection,
  TripStatus,
} from "../src/lib/generated/prisma/client";
import { defaultRoutePoints, EXVIASS } from "../src/lib/exvias/constants";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const demoDriverEmails = [
    "juan.carlos@exviass.test",
    "luis.mamani@exviass.test",
    "mario.quispe@exviass.test",
    "cesar.huaman@exviass.test",
    "edgar.puma@exviass.test",
    "raul.condori@exviass.test",
  ];

  await prisma.booking.deleteMany({
    where: {
      OR: [
        { passengerName: { startsWith: "Pasajero Demo" } },
        { passengerPhone: { startsWith: "90000000" } },
      ],
    },
  });
  await prisma.driverQueue.deleteMany();

  await prisma.user.deleteMany({
    where: { email: { in: demoDriverEmails } },
  });

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
          latitude: point.latitude,
          longitude: point.longitude,
          isTerminal: point.isTerminal ?? false,
        },
        create: {
          routeId: route.id,
          direction,
          sequence: index + 1,
          name: point.name,
          minuteOffset: point.minuteOffset,
          latitude: point.latitude,
          longitude: point.longitude,
          isTerminal: point.isTerminal ?? false,
        },
      });
    }
  }

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
        },
      });
    }

    const routeTrips = await prisma.trip.findMany({
      where: { routeId: route.id, direction },
      select: { id: true },
    });

    for (const trip of routeTrips) {
      const bookedSeats = await prisma.booking.count({
        where: {
          tripId: trip.id,
          status: { not: "CANCELLED" },
        },
      });

      await prisma.trip.update({
        where: { id: trip.id },
        data: { bookedSeats },
      });
    }
  }

  console.log("Seed EXVIASS completado sin conductores demo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
