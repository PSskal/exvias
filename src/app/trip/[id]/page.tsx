import { notFound } from "next/navigation";
import Link from "next/link";
import { LogIn, MapPin, Route, UserRound } from "lucide-react";
import { reserveSeatAction } from "@/app/actions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoutePointMapPicker } from "@/components/exvias/route-point-map-picker";

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
  const passengerProfile = await getPassengerProfile(user?.id);

  if (!details) notFound();

  const { trip, points, boardablePoints } = details;
  const occupiedSeats = trip.bookedSeats + trip.manualSeats;
  const remainingSeats = trip.route.capacity - occupiedSeats;
  const farePen = Number(trip.route.farePen);
  const depositPen = Number(trip.route.depositPen);

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

        {!user ? (
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
        ) : (
        <form action={reserveSeatAction} className="space-y-5">
          <input type="hidden" name="tripId" value={trip.id} />

          <RoutePointMapPicker
            points={points}
            boardablePointIds={boardablePoints.map((point) => point.id)}
            plannedDepartureAtIso={trip.plannedDepartureAt?.toISOString()}
          />

          <AppCard>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="size-5 text-[#073FEA]" />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Paso 2
                </p>
                <h2 className="font-black">Datos del pasajero</h2>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="passengerName">Nombre</Label>
                <Input
                  id="passengerName"
                  name="passengerName"
                  defaultValue={user?.name ?? ""}
                  required
                  minLength={2}
                  pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]+"
                  title="Ingresa solo nombres y apellidos"
                  className="h-11 rounded-[10px] bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passengerPhone">Celular peruano</Label>
                <Input
                  id="passengerPhone"
                  name="passengerPhone"
                  defaultValue={passengerProfile?.phone ?? ""}
                  required
                  maxLength={9}
                  minLength={9}
                  pattern="9[0-9]{8}"
                  placeholder="987654321"
                  title="Ingresa un celular peruano de 9 dígitos que empiece con 9"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="h-11 rounded-[10px] bg-slate-50"
                />
                <p className="text-xs font-semibold text-slate-500">
                  Debe tener 9 dígitos y empezar con 9.
                </p>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Paso 3
            </p>
            <h2 className="mt-1 font-black">Resumen de pago</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Pasaje</span>
                <strong>{formatPen(farePen)}</strong>
              </div>
              <div className="flex justify-between rounded-[12px] bg-[#F4B400]/15 px-3 py-3">
                <span className="font-black text-[#B37B00]">Adelanto 50%</span>
                <strong className="text-[#B37B00]">{formatPen(depositPen)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Saldo al abordar</span>
                <strong>{formatPen(farePen - depositPen)}</strong>
              </div>
            </div>
          </AppCard>

          <div className="sticky bottom-4 z-20">
            <Button
              className="h-12 w-full rounded-[10px] bg-[#12B85F] text-base font-black shadow-[0_14px_30px_rgba(18,184,95,0.30)] hover:bg-[#10a957]"
              disabled={remainingSeats <= 0}
            >
              <MapPin className="size-4" />
              Continuar con mi reserva
            </Button>
          </div>
        </form>
        )}
      </ContentArea>
    </PhoneShell>
  );
}
