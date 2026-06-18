import Image from "next/image";
import { Route as RouteIcon } from "lucide-react";
import { listAvailableTrips } from "@/lib/exvias/trips";
import { routeDirectionLabels } from "@/lib/exvias/constants";
import { RouteDirection } from "@/lib/generated/prisma/client";
import {
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
  AppCard,
} from "@/components/exvias/mobile-shell";
import { PassengerTripCard } from "@/components/exvias/trip-card";

export const dynamic = "force-dynamic";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const params = await searchParams;
  const direction = Object.values(RouteDirection).includes(
    params.direction as RouteDirection,
  )
    ? (params.direction as RouteDirection)
    : RouteDirection.CUSCO_TO_COLQUEPATA;
  const trips = (await listAvailableTrips()).filter(
    (trip) => trip.direction === direction,
  );

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader
        title={routeDirectionLabels[direction]}
        subtitle="Elige tu turno de salida"
      />
      <ContentArea withBottomNav className="space-y-4">
        <AppCard className="relative min-h-36 overflow-hidden bg-[linear-gradient(135deg,#FFFFFF,#EAF1FF)]">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-[#1E5BFF]/12 blur-2xl" />
          <div className="relative z-10 max-w-[58%]">
            <div className="grid size-9 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#1E5BFF]">
              <RouteIcon className="size-5" />
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">
              Ruta seleccionada
            </p>
            <p className="mt-1 text-xl font-black leading-tight text-slate-950">
              {routeDirectionLabels[direction]}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-600">
              Elige el carro y turno que más te convenga.
            </p>
          </div>
          <div className="absolute bottom-2 right-0 h-28 w-48">
            <Image
              src="/cars/transparent/avanzanegro-transparent.png"
              alt="Carro EXVIASS"
              fill
              priority
              sizes="192px"
              className="object-contain object-right drop-shadow-[0_18px_18px_rgba(0,0,0,0.30)]"
            />
          </div>
        </AppCard>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Turnos disponibles
              </p>
              <h2 className="text-lg font-black text-slate-950">
                Selecciona tu salida
              </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
              {trips.length} turnos
            </span>
          </div>
          {trips.length > 0 ? (
            trips.map((trip, index) => (
              <PassengerTripCard
                key={trip.id}
                id={trip.id}
                status={trip.status}
                label={trip.turnLabel}
                departure={trip.plannedDepartureAt}
                bookedSeats={trip.bookedSeats + trip.manualSeats}
                capacity={trip.route.capacity}
                minimumToStart={trip.route.minimumToStart}
                plate={trip.driver?.licensePlate}
                vehicleName={trip.driver?.vehicleName}
                driverName={trip.driver?.user.name}
                driverImage={trip.driver?.user.image}
                index={index}
              />
            ))
          ) : (
            <div className="rounded-[18px] bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-black text-slate-950">
                No hay turnos activos
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Crea un turno desde admin o ejecuta el seed de prueba.
              </p>
            </div>
          )}
        </section>
      </ContentArea>
      <BottomNav active="trips" />
    </PhoneShell>
  );
}
