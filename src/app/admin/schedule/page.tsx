import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatTime,
  getVehicleOption,
  routeDirectionDestinationLabels,
  routeDirectionLabels,
  tripStatusLabels,
} from "@/lib/exvias/constants";
import { getAdminDashboard } from "@/lib/exvias/trips";
import {
  QueueStatus,
  RouteDirection,
  TripStatus,
} from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ScheduleBoard } from "@/components/exvias/admin/schedule-board";

export const dynamic = "force-dynamic";

const unavailableTripStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
];

export default async function AdminSchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/admin/schedule");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") redirect("/account");

  const { trips, drivers, queue, routes } = await getAdminDashboard();
  const route = routes[0];
  const publishedDriverIds = new Set(
    trips
      .filter(
        (trip) =>
          trip.driverId && unavailableTripStatuses.includes(trip.status),
      )
      .map((trip) => trip.driverId),
  );
  const waitingQueue = queue.filter(
    (entry) => entry.status === QueueStatus.WAITING,
  );
  const queuedDriverIds = new Set(waitingQueue.map((entry) => entry.driverId));
  const publishedTrips = trips
    .filter(
      (trip) =>
        trip.driverId && unavailableTripStatuses.includes(trip.status),
    )
    .sort((a, b) => {
      const aTime = a.plannedDepartureAt?.getTime() ?? 0;
      const bTime = b.plannedDepartureAt?.getTime() ?? 0;
      return aTime - bTime;
    });
  const publishedTripsByDirection = Object.fromEntries(
    Object.values(RouteDirection).map((direction) => [
      direction,
      publishedTrips.filter((trip) => trip.direction === direction),
    ]),
  ) as Record<RouteDirection, typeof publishedTrips>;

  const toBoardDriver = (driver: (typeof drivers)[number]) => {
    const vehicle = getVehicleOption(driver.vehicleName);

    return {
      id: driver.id,
      name: driver.user.name,
      plate: driver.licensePlate ?? "Sin placa",
      vehicle: vehicle.shortName,
      yapePhone: driver.yapePhone ?? "Yape pendiente",
      available: !publishedDriverIds.has(driver.id),
    };
  };

  const freeDrivers = drivers
    .filter(
      (driver) =>
        driver.isActive &&
        !publishedDriverIds.has(driver.id) &&
        !queuedDriverIds.has(driver.id),
    )
    .map(toBoardDriver);
  const queues = Object.fromEntries(
    Object.values(RouteDirection).map((direction) => [
      direction,
      waitingQueue
        .filter((entry) => entry.direction === direction)
        .sort((a, b) => a.position - b.position)
        .map((entry) => toBoardDriver(entry.driver)),
    ]),
  ) as Record<RouteDirection, ReturnType<typeof toBoardDriver>[]>;
  const boardVersion = [
    ...freeDrivers.map((driver) => `free:${driver.id}`),
    ...Object.values(RouteDirection).flatMap((direction) =>
      queues[direction].map((driver, index) => `${direction}:${index}:${driver.id}`),
    ),
  ].join("|");

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-10 pt-5 text-zinc-950 sm:px-6">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1E5BFF]">EXVIASS S.A.</p>
            <h1 className="text-2xl font-black">Gestión de rampa</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              Ordena los carros por llegada. Si un conductor se reincorpora,
              colócalo al final de la rampa actual.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-white px-4 text-sm font-black text-[#1E5BFF] ring-1 ring-zinc-200"
          >
            Volver al panel
          </Link>
        </header>

        <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Turnos publicados</h2>
              <p className="text-sm font-semibold text-zinc-500">
                Estos son los carros que ya salieron de la rampa y son visibles
                para pasajeros.
              </p>
            </div>
            <span className="rounded-full bg-[#1E5BFF]/10 px-3 py-1 text-xs font-black text-[#1E5BFF]">
              {publishedTrips.length} publicados
            </span>
          </div>

          {publishedTrips.length === 0 ? (
            <p className="mt-3 rounded-[8px] bg-[#F5F7FA] p-3 text-sm font-semibold text-zinc-500">
              Todavía no hay turnos publicados. Publica el siguiente desde la
              rampa.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {Object.values(RouteDirection).map((direction) => (
                <div
                  key={direction}
                  className="rounded-[10px] bg-[#F5F7FA] p-3 ring-1 ring-zinc-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#1E5BFF]">
                        Salen hacia {routeDirectionDestinationLabels[direction]}
                      </p>
                      <h3 className="font-black">
                        {routeDirectionLabels[direction]}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-zinc-500">
                      {publishedTripsByDirection[direction].length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {publishedTripsByDirection[direction].length === 0 ? (
                      <p className="rounded-[8px] bg-white p-3 text-sm font-semibold text-zinc-500">
                        Sin carros publicados en esta dirección.
                      </p>
                    ) : (
                      publishedTripsByDirection[direction].map((trip, index) => {
                        const vehicle = getVehicleOption(trip.driver?.vehicleName);

                        return (
                          <article
                            key={trip.id}
                            className="rounded-[8px] bg-white p-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1E5BFF]/10 text-xs font-black text-[#1E5BFF]">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-black">
                                      {formatTime(trip.plannedDepartureAt)} ·{" "}
                                      {trip.turnLabel}
                                    </p>
                                    <p className="text-xs font-semibold text-zinc-500">
                                      {tripStatusLabels[trip.status]} ·{" "}
                                      {trip.bookedSeats + trip.manualSeats}/
                                      {trip.route.capacity} pasajeros
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[#F5F7FA] px-2 py-1 text-xs font-black text-zinc-500">
                                    {vehicle.shortName}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-semibold">
                                  {trip.driver?.user.name ?? "Sin conductor"}
                                </p>
                                <p className="text-xs font-semibold text-zinc-500">
                                  {trip.driver?.licensePlate ?? "Sin placa"} · al
                                  completar entra a rampa de{" "}
                                  {routeDirectionDestinationLabels[direction]}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {route ? (
          <ScheduleBoard
            key={boardVersion}
            routeId={route.id}
            freeDrivers={freeDrivers}
            queues={queues}
            directions={[
              {
                id: RouteDirection.CUSCO_TO_COLQUEPATA,
                label: routeDirectionLabels.CUSCO_TO_COLQUEPATA,
                startLabel: "4:30 a.m.",
                nextLabel: "5:00 a.m.",
              },
              {
                id: RouteDirection.COLQUEPATA_TO_CUSCO,
                label: routeDirectionLabels.COLQUEPATA_TO_CUSCO,
                startLabel: "3:30 a.m.",
                nextLabel: "4:00 a.m.",
              },
            ]}
          />
        ) : (
          <div className="rounded-[12px] bg-white p-5 text-sm font-semibold text-zinc-500 shadow-sm ring-1 ring-zinc-200">
            Primero crea una ruta activa para gestionar la rampa.
          </div>
        )}
      </section>
    </main>
  );
}
