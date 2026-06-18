import prisma from "@/lib/prisma";
import { RouteDirection, TripStatus } from "@/lib/generated/prisma/client";
import { defaultRoutePoints, EXVIASS } from "@/lib/exvias/constants";

export async function ensureDefaultRoute() {
  const route = await prisma.route.upsert({
    where: {
      origin_destination: {
        origin: "Cusco",
        destination: "Colquepata",
      },
    },
    update: {
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
    const existing = await prisma.routePoint.count({
      where: { routeId: route.id, direction },
    });

    if (existing === 0) {
      await prisma.routePoint.createMany({
        data: defaultRoutePoints[direction].map((point, index) => ({
          routeId: route.id,
          direction,
          name: point.name,
          sequence: index + 1,
          minuteOffset: point.minuteOffset,
          latitude: point.latitude,
          longitude: point.longitude,
          isTerminal: point.isTerminal ?? false,
        })),
      });
    }
  }

  return route;
}

export async function getRoutesWithPoints() {
  return prisma.route.findMany({
    where: { isActive: true },
    include: {
      points: {
        orderBy: [{ direction: "asc" }, { sequence: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRoutesOverview() {
  return prisma.route.findMany({
    where: { isActive: true },
    include: {
      points: {
        orderBy: [{ direction: "asc" }, { sequence: "asc" }],
      },
      trips: {
        where: {
          status: {
            in: [TripStatus.QUEUED, TripStatus.ACTIVE, TripStatus.BOARDING],
          },
          driverId: { not: null },
        },
        include: {
          bookings: true,
        },
        orderBy: [{ plannedDepartureAt: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
