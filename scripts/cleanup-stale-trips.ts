import "dotenv/config";
import prisma from "../src/lib/prisma";
import { TripStatus } from "../src/lib/generated/prisma/client";

async function main() {
  const staleWhere = {
    driverId: null,
    status: {
      in: [TripStatus.QUEUED, TripStatus.ACTIVE, TripStatus.BOARDING],
    },
    bookings: {
      none: {},
    },
  };

  const staleTrips = await prisma.trip.findMany({
    where: staleWhere,
    select: {
      id: true,
      direction: true,
      status: true,
      turnLabel: true,
      plannedDepartureAt: true,
    },
    orderBy: [{ direction: "asc" }, { plannedDepartureAt: "asc" }],
  });

  if (staleTrips.length === 0) {
    console.log("No hay turnos antiguos sin conductor para cancelar.");
    return;
  }

  const result = await prisma.trip.updateMany({
    where: staleWhere,
    data: {
      status: TripStatus.CANCELLED,
    },
  });

  console.log(`Turnos cancelados: ${result.count}`);
  for (const trip of staleTrips) {
    console.log(
      `- ${trip.id} | ${trip.direction} | ${trip.turnLabel} | ${trip.status}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
