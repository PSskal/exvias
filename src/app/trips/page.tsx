import Link from "next/link";
import { Info, Route as RouteIcon } from "lucide-react";
import { listAvailableTrips } from "@/lib/exvias/trips";
import {
  routeDirectionLabels,
  routeDirectionShortLabels,
} from "@/lib/exvias/constants";
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
import { cn } from "@/lib/utils";

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
      <BlueHeader title={routeDirectionLabels[direction]} subtitle="Elige tu turno de salida" />
      <ContentArea withBottomNav className="space-y-4">
        <AppCard className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#073FEA]">
              <RouteIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Ruta seleccionada</p>
              <p className="font-black text-slate-950">{routeDirectionLabels[direction]}</p>
            </div>
          </div>
        </AppCard>

        <div className="flex items-start gap-2 rounded-[12px] bg-white/80 p-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/70">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p>Elige el turno en el que deseas viajar. El viaje sale con mínimo 4 pasajeros.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.values(RouteDirection).map((item) => (
            <Link
              key={item}
              href={`/trips?direction=${item}`}
              className={cn(
                "rounded-[10px] border bg-white px-3 py-2 text-center text-sm font-black",
                item === direction
                  ? "border-[#073FEA] text-[#073FEA] shadow-sm"
                  : "border-transparent text-slate-500",
              )}
            >
              Desde {routeDirectionShortLabels[item]}
            </Link>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Turnos disponibles
              </p>
              <h2 className="text-lg font-black">Selecciona tu salida</h2>
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
                bookedSeats={trip.bookedSeats}
                capacity={trip.route.capacity}
                minimumToStart={trip.route.minimumToStart}
                plate={trip.driver?.licensePlate}
                index={index}
              />
            ))
          ) : (
            <div className="rounded-[10px] bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-black">No hay turnos activos</p>
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
