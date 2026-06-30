import { notFound } from "next/navigation";
import Link from "next/link";
import { LogIn, Route } from "lucide-react";
import {
  getPassengerProfile,
  getTripBookingOptions,
} from "@/lib/exvias/trips";
import {
  formatPen,
  formatTime,
  routeDirectionLabels,
} from "@/lib/exvias/constants";
import { getCurrentUser } from "@/lib/session";
import {
  BlueHeader,
  ContentArea,
  PhoneShell,
  StatusBar,
  AppCard,
} from "@/components/exvias/mobile-shell";
import { TripBookingSheet } from "@/components/exvias/trip-booking-sheet";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [details, user] = await Promise.all([
    getTripBookingOptions(id).catch(() => null),
    getCurrentUser(),
  ]);

  if (!details) notFound();

  const { trip, points, boardablePoints } = details;
  const occupiedSeats = trip.bookedSeats + trip.manualSeats;
  const remainingSeats = trip.route.capacity - occupiedSeats;
  const farePen = Number(trip.route.farePen);
  const depositPen = Number(trip.route.depositPen);

  if (!user) {
    return (
      <PhoneShell>
        <StatusBar />
        <BlueHeader title="Punto de subida" href="/trips" subtitle="Reserva tu asiento" />
        <ContentArea className="space-y-4">
          <AppCard>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#073FEA]">
                <Route className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">Ruta</p>
                <p className="truncate font-black">{routeDirectionLabels[trip.direction]}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-[12px] bg-slate-50 p-3 text-center text-sm">
              <div>
                <p className="text-xs text-slate-500">Turno</p>
                <p className="font-black">{formatTime(trip.plannedDepartureAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cupos</p>
                <p className="font-black">
                  {remainingSeats}/{trip.route.capacity}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Adelanto</p>
                <p className="font-black text-[#F4B400]">
                  {formatPen(trip.route.depositPen)}
                </p>
              </div>
            </div>
          </AppCard>

          <AppCard className="space-y-4 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#1E5BFF]/10 text-[#073FEA]">
              <LogIn className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-black">Inicia sesión para reservar</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Puedes revisar turnos sin cuenta, pero para guardar tu asiento necesitamos identificarte.
              </p>
            </div>
            <Link
              href={`/login?callbackURL=/trip/${trip.id}`}
              className="flex h-12 items-center justify-center rounded-[10px] bg-[#073FEA] text-base font-black text-white"
            >
              Ingresar y reservar
            </Link>
          </AppCard>
        </ContentArea>
      </PhoneShell>
    );
  }

  const passengerProfile = await getPassengerProfile(user.id);

  return (
    <PhoneShell>
      <TripBookingSheet
        tripId={trip.id}
        backHref="/trips"
        points={points}
        boardablePointIds={boardablePoints.map((point) => point.id)}
        plannedDepartureAtIso={trip.plannedDepartureAt?.toISOString() ?? null}
        turnLabel={trip.turnLabel}
        remainingSeats={remainingSeats}
        capacity={trip.route.capacity}
        userName={user.name ?? ""}
        passengerPhone={passengerProfile?.phone ?? ""}
        farePen={farePen}
        depositPen={depositPen}
      />
    </PhoneShell>
  );
}
