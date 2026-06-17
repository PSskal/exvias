import { notFound } from "next/navigation";
import Link from "next/link";
import { LogIn, MapPin, Route, UserRound } from "lucide-react";
import { reserveSeatAction } from "@/app/actions";
import { getTripBookingOptions } from "@/lib/exvias/trips";
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
import { cn } from "@/lib/utils";

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

  const { trip, points } = details;
  const remainingSeats = trip.route.capacity - trip.bookedSeats;
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

          <section className="relative rounded-[16px] bg-[linear-gradient(180deg,#f8fafc,#eef4f6)] p-4 shadow-inner ring-1 ring-slate-200/70">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Paso 1
              </p>
              <h2 className="font-black">Selecciona dónde subirás</h2>
            </div>
            <div className="absolute bottom-9 left-[33px] top-24 w-1 rounded-full bg-[#1E5BFF]" />
            <div className="space-y-3">
              {points.map((point, index) => (
                <label key={point.id} className="relative flex gap-4">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="boardingPointId"
                    value={point.id}
                    defaultChecked={index === 1 || index === 0}
                    required
                  />
                  <span
                    className={cn(
                      "relative z-10 mt-5 grid size-5 shrink-0 place-items-center rounded-full border-4 border-white bg-[#1E5BFF] shadow",
                      point.isTerminal && "bg-[#E53935]",
                    )}
                  >
                    <span className="size-2 rounded-full bg-white" />
                  </span>
                  <span className="block flex-1 rounded-[10px] bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.10)] ring-1 ring-transparent peer-checked:ring-2 peer-checked:ring-[#1E5BFF]">
                    <span className="block text-sm font-black">{point.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Paso aprox:{" "}
                      {trip.plannedDepartureAt
                        ? formatTime(
                            new Date(
                              trip.plannedDepartureAt.getTime() +
                                point.minuteOffset * 60_000,
                            ),
                          )
                        : `+${point.minuteOffset} min`}
                    </span>
                    {!point.isTerminal && (
                      <span className="mt-3 hidden rounded-lg bg-[#073FEA] py-2 text-center text-xs font-black text-white peer-checked:block">
                        Subir aquí
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </section>

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
                  className="h-11 rounded-[10px] bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passengerPhone">Celular</Label>
                <Input
                  id="passengerPhone"
                  name="passengerPhone"
                  required
                  inputMode="tel"
                  className="h-11 rounded-[10px] bg-slate-50"
                />
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
